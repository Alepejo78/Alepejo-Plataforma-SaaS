import { Injectable } from '@nestjs/common';
import {
  Employee,
  EmployeeDependent,
  PayrollLineType,
  PayrollTaxBracket,
  PayrollTaxTable,
} from '@prisma/client';

import { PayrollCalculationService } from './payroll-calculation.service';
import { PayrollLineInput } from './payroll-item-builder.service';

export type EmployeeForThirteenth = Employee & { dependents: EmployeeDependent[] };

export interface ComputedThirteenthSalaryItem {
  baseSalary: number;
  monthsWorked: number;
  grossAmount: number;
  previousInstallmentAmount: number;
  otherEarnings: number;
  otherDeductions: number;
  inssBase: number;
  inssAmount: number;
  irrfBase: number;
  irrfAmount: number;
  netAmount: number;
  employerFgtsAmount: number;
  lines: PayrollLineInput[];
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Avos = meses trabalhados no ano — conta o mês de admissão se o
 * colaborador entrou até o dia 15 dele (regra padrão CLT). Sem campo
 * de admissão, considera o ano inteiro (colaborador antigo).
 */
function countMonthsWorked(admissionDate: Date | null, year: number, throughMonth: number): number {
  if (!admissionDate) {
    return throughMonth;
  }

  const admissionYear = admissionDate.getUTCFullYear();

  if (admissionYear > year) {
    return 0;
  }

  let startMonth = 1;

  if (admissionYear === year) {
    const admissionMonth = admissionDate.getUTCMonth() + 1;
    const admissionDay = admissionDate.getUTCDate();

    startMonth = admissionDay <= 15 ? admissionMonth : admissionMonth + 1;
  }

  return Math.max(0, Math.min(12, throughMonth - startMonth + 1));
}

@Injectable()
export class ThirteenthSalaryItemBuilderService {
  constructor(private readonly calc: PayrollCalculationService) {}

  build(
    employee: EmployeeForThirteenth,
    params: {
      year: number;
      installment: number;
      throughMonth: number;
      previousInstallmentAmount: number;
      taxTable: PayrollTaxTable & { brackets: PayrollTaxBracket[] };
      adjustments: { otherEarnings: number; otherDeductions: number };
    },
  ): ComputedThirteenthSalaryItem {
    const baseSalary = Number(employee.baseSalary ?? 0);
    const monthsWorked = countMonthsWorked(
      employee.admissionDate,
      params.year,
      params.throughMonth,
    );
    const proportional = round2((baseSalary / 12) * monthsWorked);

    const otherEarnings = round2(params.adjustments.otherEarnings);
    const otherDeductions = round2(params.adjustments.otherDeductions);

    const lines: PayrollLineInput[] = [];
    let sortOrder = 1;

    let grossAmount: number;
    let inssBase = 0;
    let inssAmount = 0;
    let irrfBase = 0;
    let irrfAmount = 0;
    let employerFgtsAmount = 0;

    if (params.installment === 1) {
      grossAmount = round2(proportional * 0.5);

      lines.push({
        type: PayrollLineType.PROVENTO,
        code: '13_PARCELA_1',
        description: '13º salário — 1ª parcela (adiantamento)',
        referenceValue: `${monthsWorked}/12 avos`,
        amount: grossAmount,
        sortOrder: sortOrder++,
      });

      employerFgtsAmount = this.calc.calculateFgts(grossAmount, params.taxTable);
    } else {
      grossAmount = proportional;

      lines.push({
        type: PayrollLineType.PROVENTO,
        code: '13_TOTAL',
        description: '13º salário — valor total',
        referenceValue: `${monthsWorked}/12 avos`,
        amount: grossAmount,
        sortOrder: sortOrder++,
      });

      if (params.previousInstallmentAmount > 0) {
        lines.push({
          type: PayrollLineType.DESCONTO,
          code: '13_PARCELA_1_PAGA',
          description: '1ª parcela já paga',
          amount: params.previousInstallmentAmount,
          sortOrder: sortOrder++,
        });
      }

      inssBase = grossAmount;
      inssAmount = this.calc.calculateInss(inssBase, params.taxTable);

      const eligibleDependents = employee.dependents.filter((d) => d.irrfEligible).length;
      const irrf = this.calc.calculateIrrf(
        grossAmount,
        inssAmount,
        eligibleDependents,
        params.taxTable,
      );

      irrfBase = irrf.base;
      irrfAmount = irrf.amount;

      if (inssAmount > 0) {
        lines.push({
          type: PayrollLineType.DESCONTO,
          code: 'INSS',
          description: 'INSS (sobre o 13º total)',
          referenceValue: `sobre ${inssBase.toFixed(2)}`,
          amount: inssAmount,
          sortOrder: sortOrder++,
        });
      }

      if (irrfAmount > 0) {
        lines.push({
          type: PayrollLineType.DESCONTO,
          code: 'IRRF',
          description: 'IRRF (sobre o 13º total)',
          referenceValue: `sobre ${irrfBase.toFixed(2)}`,
          amount: irrfAmount,
          sortOrder: sortOrder++,
        });
      }

      employerFgtsAmount = this.calc.calculateFgts(
        round2(grossAmount - params.previousInstallmentAmount),
        params.taxTable,
      );
    }

    if (otherEarnings > 0) {
      lines.push({
        type: PayrollLineType.PROVENTO,
        code: 'OUTROS_PROVENTOS',
        description: 'Outros proventos (lançamento manual)',
        amount: otherEarnings,
        sortOrder: sortOrder++,
      });
    }

    if (otherDeductions > 0) {
      lines.push({
        type: PayrollLineType.DESCONTO,
        code: 'OUTROS_DESCONTOS',
        description: 'Outros descontos (lançamento manual)',
        amount: otherDeductions,
        sortOrder: sortOrder++,
      });
    }

    const netAmount = round2(
      grossAmount +
        otherEarnings -
        params.previousInstallmentAmount -
        inssAmount -
        irrfAmount -
        otherDeductions,
    );

    return {
      baseSalary,
      monthsWorked,
      grossAmount,
      previousInstallmentAmount: params.previousInstallmentAmount,
      otherEarnings,
      otherDeductions,
      inssBase,
      inssAmount,
      irrfBase,
      irrfAmount,
      netAmount,
      employerFgtsAmount,
      lines,
    };
  }
}
