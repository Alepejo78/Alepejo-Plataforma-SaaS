import { Injectable } from '@nestjs/common';
import {
  EmployeeDependent,
  PayrollLineType,
  PayrollTaxBracket,
  PayrollTaxTable,
} from '@prisma/client';

import { PayrollCalculationService } from './payroll-calculation.service';
import { PayrollLineInput } from './payroll-item-builder.service';

export interface ComputedVacationGrant {
  vacationAmount: number;
  constitutionalThirdAmount: number;
  soldAmount: number;
  soldThirdAmount: number;
  otherEarnings: number;
  otherDeductions: number;
  grossAmount: number;
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

@Injectable()
export class VacationGrantBuilderService {
  constructor(private readonly calc: PayrollCalculationService) {}

  build(params: {
    baseSalary: number;
    days: number;
    soldDays: number;
    dependents: EmployeeDependent[];
    taxTable: PayrollTaxTable & { brackets: PayrollTaxBracket[] };
    adjustments: { otherEarnings: number; otherDeductions: number };
  }): ComputedVacationGrant {
    const dailyRate = params.baseSalary / 30;

    const vacationAmount = round2(dailyRate * params.days);
    const constitutionalThirdAmount = round2(vacationAmount / 3);
    const soldAmount = round2(dailyRate * params.soldDays);
    const soldThirdAmount = round2(soldAmount / 3);

    const otherEarnings = round2(params.adjustments.otherEarnings);
    const otherDeductions = round2(params.adjustments.otherDeductions);

    const lines: PayrollLineInput[] = [];
    let sortOrder = 1;

    lines.push({
      type: PayrollLineType.PROVENTO,
      code: 'FERIAS',
      description: 'Férias',
      referenceValue: `${params.days} dia(s)`,
      amount: vacationAmount,
      sortOrder: sortOrder++,
    });

    lines.push({
      type: PayrollLineType.PROVENTO,
      code: 'FERIAS_TERCO',
      description: '1/3 constitucional',
      amount: constitutionalThirdAmount,
      sortOrder: sortOrder++,
    });

    if (params.soldDays > 0) {
      lines.push({
        type: PayrollLineType.PROVENTO,
        code: 'ABONO_PECUNIARIO',
        description: 'Abono pecuniário (venda de férias)',
        referenceValue: `${params.soldDays} dia(s) — isento`,
        amount: soldAmount,
        sortOrder: sortOrder++,
      });

      lines.push({
        type: PayrollLineType.PROVENTO,
        code: 'ABONO_TERCO',
        description: '1/3 sobre o abono — isento',
        amount: soldThirdAmount,
        sortOrder: sortOrder++,
      });
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

    const grossAmount = round2(vacationAmount + constitutionalThirdAmount);

    const inssBase = grossAmount;
    const inssAmount = this.calc.calculateInss(inssBase, params.taxTable);

    const eligibleDependents = params.dependents.filter((d) => d.irrfEligible).length;
    const irrf = this.calc.calculateIrrf(grossAmount, inssAmount, eligibleDependents, params.taxTable);

    if (inssAmount > 0) {
      lines.push({
        type: PayrollLineType.DESCONTO,
        code: 'INSS',
        description: 'INSS (sobre férias + 1/3, sem o abono)',
        referenceValue: `sobre ${inssBase.toFixed(2)}`,
        amount: inssAmount,
        sortOrder: sortOrder++,
      });
    }

    if (irrf.amount > 0) {
      lines.push({
        type: PayrollLineType.DESCONTO,
        code: 'IRRF',
        description: 'IRRF (sobre férias + 1/3, sem o abono)',
        referenceValue: `sobre ${irrf.base.toFixed(2)}`,
        amount: irrf.amount,
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
      vacationAmount +
        constitutionalThirdAmount +
        soldAmount +
        soldThirdAmount +
        otherEarnings -
        inssAmount -
        irrf.amount -
        otherDeductions,
    );

    const employerFgtsAmount = this.calc.calculateFgts(grossAmount, params.taxTable);

    return {
      vacationAmount,
      constitutionalThirdAmount,
      soldAmount,
      soldThirdAmount,
      otherEarnings,
      otherDeductions,
      grossAmount,
      inssBase,
      inssAmount,
      irrfBase: irrf.base,
      irrfAmount: irrf.amount,
      netAmount,
      employerFgtsAmount,
      lines,
    };
  }
}
