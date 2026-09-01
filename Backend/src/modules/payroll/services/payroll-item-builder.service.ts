import { Injectable } from '@nestjs/common';
import {
  BenefitCalculationType,
  Employee,
  EmployeeBenefit,
  EmployeeDependent,
  PayrollLineType,
  PayrollSettings,
  PayrollTaxBracket,
  PayrollTaxTable,
  SalaryType,
} from '@prisma/client';

import { PayrollCalculationService } from './payroll-calculation.service';
import { PayrollMonthSummary } from './payroll-month-summary.service';

/**
 * Jornada padrão pra converter salário mensal em valor/hora quando o
 * colaborador é MENSALISTA (não existe campo de "horas contratuais"
 * no cadastro hoje — 220h/mês é o divisor tradicionalmente usado no
 * mercado pra jornada de 44h semanais). Ver limitações no plano.
 */
const STANDARD_MONTHLY_HOURS = 220;

export type EmployeeForPayroll = Employee & {
  dependents: EmployeeDependent[];
  employeeBenefits: (EmployeeBenefit & {
    benefit: {
      name: string;
      calculationType: BenefitCalculationType;
      isTransportVoucher: boolean;
    };
  })[];
};

export interface PayrollLineInput {
  type: PayrollLineType;
  code: string;
  description: string;
  referenceValue?: string;
  amount: number;
  sortOrder: number;
}

export interface ComputedPayrollItem {
  baseSalary: number;
  salaryType: SalaryType;
  dependentsCount: number;
  workedMinutes: number;
  expectedMinutes: number;
  extraMinutes: number;
  extraAmount: number;
  unjustifiedAbsenceDays: number;
  absenceDeductionAmount: number;
  transportVoucherDeduction: number;
  benefitDeductions: number;
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
export class PayrollItemBuilderService {
  constructor(private readonly calc: PayrollCalculationService) {}

  build(
    employee: EmployeeForPayroll,
    summary: PayrollMonthSummary,
    taxTable: PayrollTaxTable & { brackets: PayrollTaxBracket[] },
    settings: PayrollSettings,
    adjustments: { otherEarnings: number; otherDeductions: number },
  ): ComputedPayrollItem {
    const baseSalary = Number(employee.baseSalary ?? 0);
    const salaryType = employee.salaryType ?? SalaryType.MENSALISTA;
    const surchargePct = Number(settings.extraHourSurchargePercentage);
    const extraHours = summary.extraMinutes / 60;

    const lines: PayrollLineInput[] = [];
    let sortOrder = 1;
    let grossBase = 0;
    let extraAmount = 0;
    let absenceDeductionAmount = 0;

    if (salaryType === SalaryType.HORISTA) {
      const hourlyRate = baseSalary;
      const workedHours = summary.workedMinutes / 60;

      grossBase = round2(hourlyRate * workedHours);
      extraAmount = round2(hourlyRate * (surchargePct / 100) * extraHours);

      lines.push({
        type: PayrollLineType.PROVENTO,
        code: 'SALARIO_HORAS',
        description: 'Salário (horas trabalhadas)',
        referenceValue: `${workedHours.toFixed(1)}h × ${hourlyRate.toFixed(2)}`,
        amount: grossBase,
        sortOrder: sortOrder++,
      });
    } else if (salaryType === SalaryType.DIARISTA) {
      const dailyRate = baseSalary;

      grossBase = round2(dailyRate * summary.workedDays);

      lines.push({
        type: PayrollLineType.PROVENTO,
        code: 'SALARIO_DIARIAS',
        description: 'Salário (diárias trabalhadas)',
        referenceValue: `${summary.workedDays} dia(s) × ${dailyRate.toFixed(2)}`,
        amount: grossBase,
        sortOrder: sortOrder++,
      });
    } else {
      // MENSALISTA, COMISSIONADO e OUTRO usam o mesmo cálculo de
      // salário fixo mensal (remuneração variável de comissionado
      // entra manualmente em "otherEarnings").
      absenceDeductionAmount = round2((baseSalary / 30) * summary.unjustifiedAbsenceDays);
      grossBase = round2(baseSalary - absenceDeductionAmount);

      const hourlyRate = baseSalary / STANDARD_MONTHLY_HOURS;

      extraAmount = round2(hourlyRate * (1 + surchargePct / 100) * extraHours);

      lines.push({
        type: PayrollLineType.PROVENTO,
        code: 'SALARIO_BASE',
        description: 'Salário base',
        amount: baseSalary,
        sortOrder: sortOrder++,
      });

      if (absenceDeductionAmount > 0) {
        lines.push({
          type: PayrollLineType.DESCONTO,
          code: 'FALTA_INJUSTIFICADA',
          description: 'Desconto por falta injustificada',
          referenceValue: `${summary.unjustifiedAbsenceDays} dia(s)`,
          amount: absenceDeductionAmount,
          sortOrder: sortOrder++,
        });
      }
    }

    if (extraAmount > 0) {
      lines.push({
        type: PayrollLineType.PROVENTO,
        code: 'HORAS_EXTRAS',
        description: `Horas extras (+${surchargePct}%)`,
        referenceValue: `${extraHours.toFixed(1)}h`,
        amount: extraAmount,
        sortOrder: sortOrder++,
      });
    }

    const otherEarnings = round2(adjustments.otherEarnings);
    const otherDeductions = round2(adjustments.otherDeductions);

    if (otherEarnings > 0) {
      lines.push({
        type: PayrollLineType.PROVENTO,
        code: 'OUTROS_PROVENTOS',
        description: 'Outros proventos (lançamento manual)',
        amount: otherEarnings,
        sortOrder: sortOrder++,
      });
    }

    const transportVoucherDeduction = this.calculateTransportVoucher(
      employee,
      baseSalary,
      settings,
    );

    if (transportVoucherDeduction > 0) {
      lines.push({
        type: PayrollLineType.DESCONTO,
        code: 'VALE_TRANSPORTE',
        description: 'Vale Transporte',
        referenceValue: `${Number(settings.transportVoucherPercentage)}%`,
        amount: transportVoucherDeduction,
        sortOrder: sortOrder++,
      });
    }

    // Demais benefícios cadastrados pro colaborador (Plano de Saúde,
    // Vale Refeição etc.) — o Vale Transporte já foi tratado acima
    // (regra própria de teto), aqui é só o resto.
    let benefitDeductions = 0;

    for (const eb of employee.employeeBenefits) {
      if (eb.benefit.isTransportVoucher) {
        continue;
      }

      const amount =
        eb.value !== null
          ? Number(eb.value)
          : eb.percentage !== null
            ? round2(baseSalary * (Number(eb.percentage) / 100))
            : 0;

      if (amount <= 0) {
        continue;
      }

      benefitDeductions = round2(benefitDeductions + amount);

      lines.push({
        type: PayrollLineType.DESCONTO,
        code: 'BENEFICIO',
        description: eb.benefit.name,
        referenceValue:
          eb.benefit.calculationType === BenefitCalculationType.PERCENTAGE
            ? `${Number(eb.percentage).toFixed(2).replace('.', ',')}%`
            : undefined,
        amount,
        sortOrder: sortOrder++,
      });
    }

    const grossAmount = round2(grossBase + extraAmount + otherEarnings);

    const inssBase = grossAmount;
    const inssAmount = this.calc.calculateInss(inssBase, taxTable);
    const inssRate = this.calc.findBracketRate(
      inssBase,
      taxTable.brackets.filter((b) => b.taxType === 'INSS'),
    );

    const eligibleDependents = employee.dependents.filter((d) => d.irrfEligible).length;
    const { base: irrfBase, amount: irrfAmount } = this.calc.calculateIrrf(
      grossAmount,
      inssAmount,
      eligibleDependents,
      taxTable,
    );
    const irrfRate = this.calc.findBracketRate(
      irrfBase,
      taxTable.brackets.filter((b) => b.taxType === 'IRRF'),
    );

    if (inssAmount > 0) {
      lines.push({
        type: PayrollLineType.DESCONTO,
        code: 'INSS',
        description: 'INSS',
        referenceValue:
          inssRate !== null
            ? `${inssRate.toFixed(2).replace('.', ',')}%`
            : undefined,
        amount: inssAmount,
        sortOrder: sortOrder++,
      });
    }

    if (irrfAmount > 0) {
      lines.push({
        type: PayrollLineType.DESCONTO,
        code: 'IRRF',
        description: 'IRRF',
        referenceValue:
          irrfRate !== null
            ? `${irrfRate.toFixed(2).replace('.', ',')}%`
            : undefined,
        amount: irrfAmount,
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
      grossAmount -
        inssAmount -
        irrfAmount -
        transportVoucherDeduction -
        benefitDeductions -
        otherDeductions,
    );

    const employerFgtsAmount = this.calc.calculateFgts(grossAmount, taxTable);

    return {
      baseSalary,
      salaryType,
      dependentsCount: eligibleDependents,
      workedMinutes: summary.workedMinutes,
      expectedMinutes: summary.expectedMinutes,
      extraMinutes: summary.extraMinutes,
      extraAmount,
      unjustifiedAbsenceDays: summary.unjustifiedAbsenceDays,
      absenceDeductionAmount,
      transportVoucherDeduction,
      benefitDeductions,
      otherEarnings,
      otherDeductions,
      grossAmount,
      inssBase,
      inssAmount,
      irrfBase,
      irrfAmount,
      netAmount,
      employerFgtsAmount,
      lines,
    };
  }

  private calculateTransportVoucher(
    employee: EmployeeForPayroll,
    baseSalary: number,
    settings: PayrollSettings,
  ): number {
    const voucher = employee.employeeBenefits.find((eb) => eb.benefit.isTransportVoucher);

    if (!voucher) {
      return 0;
    }

    const percentageCap = round2(baseSalary * (Number(settings.transportVoucherPercentage) / 100));

    const registeredCost =
      voucher.value !== null
        ? Number(voucher.value)
        : voucher.percentage !== null
          ? round2(baseSalary * (Number(voucher.percentage) / 100))
          : null;

    if (registeredCost === null) {
      return percentageCap;
    }

    return Math.min(percentageCap, registeredCost);
  }
}
