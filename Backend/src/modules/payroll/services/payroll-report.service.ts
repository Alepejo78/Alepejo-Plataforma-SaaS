import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../core/prisma/prisma.service';

export interface ChargesBucket {
  count: number;
  totalGross: number;
  totalInss: number;
  totalIrrf: number;
  totalFgts: number;
  totalVt: number;
  totalBenefits: number;
  totalNet: number;
}

function emptyBucket(): ChargesBucket {
  return {
    count: 0,
    totalGross: 0,
    totalInss: 0,
    totalIrrf: 0,
    totalFgts: 0,
    totalVt: 0,
    totalBenefits: 0,
    totalNet: 0,
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Relatório consolidado de encargos (INSS+IRRF+FGTS+VT) de uma
 * competência — junta Folha mensal, 13º salário e Férias, cada um com
 * sua própria noção de "quando aconteceu" (Folha usa a competência em
 * si; 13º e Férias não têm competência mensal, então entram pelo mês
 * em que foram aprovados — é quando o encargo de fato existe).
 */
@Injectable()
export class PayrollReportService {
  constructor(private readonly prisma: PrismaService) {}

  async getMonthlyCharges(companyId: string, year: number, month: number) {
    const monthStart = new Date(Date.UTC(year, month - 1, 1));
    const monthEnd = new Date(Date.UTC(year, month, 1));

    const [payrolls, thirteenthItems, vacationGrants] = await Promise.all([
      this.prisma.payroll.findMany({
        where: { companyId, competenceYear: year, competenceMonth: month, status: 'APPROVED' },
        include: { items: { where: { status: { not: 'EXCLUDED' } } } },
      }),
      this.prisma.thirteenthSalaryItem.findMany({
        where: {
          status: { not: 'EXCLUDED' },
          thirteenthSalary: {
            companyId,
            status: 'APPROVED',
            approvedAt: { gte: monthStart, lt: monthEnd },
          },
        },
      }),
      this.prisma.vacationGrant.findMany({
        where: {
          companyId,
          status: 'APPROVED',
          approvedAt: { gte: monthStart, lt: monthEnd },
        },
      }),
    ]);

    const payroll = payrolls
      .flatMap((p) => p.items)
      .reduce((acc, item) => {
        acc.count += 1;
        acc.totalGross += Number(item.grossAmount);
        acc.totalInss += Number(item.inssAmount);
        acc.totalIrrf += Number(item.irrfAmount);
        acc.totalFgts += Number(item.employerFgtsAmount);
        acc.totalVt += Number(item.transportVoucherDeduction);
        acc.totalBenefits += Number(item.benefitDeductions);
        acc.totalNet += Number(item.netAmount);

        return acc;
      }, emptyBucket());

    const thirteenthSalary = thirteenthItems.reduce((acc, item) => {
      acc.count += 1;
      acc.totalGross += Number(item.grossAmount);
      acc.totalInss += Number(item.inssAmount);
      acc.totalIrrf += Number(item.irrfAmount);
      acc.totalFgts += Number(item.employerFgtsAmount);
      acc.totalNet += Number(item.netAmount);

      return acc;
    }, emptyBucket());

    const vacation = vacationGrants.reduce((acc, grant) => {
      acc.count += 1;
      acc.totalGross += Number(grant.grossAmount);
      acc.totalInss += Number(grant.inssAmount);
      acc.totalIrrf += Number(grant.irrfAmount);
      acc.totalFgts += Number(grant.employerFgtsAmount);
      acc.totalNet += Number(grant.netAmount);

      return acc;
    }, emptyBucket());

    const round = (bucket: ChargesBucket): ChargesBucket => ({
      count: bucket.count,
      totalGross: round2(bucket.totalGross),
      totalInss: round2(bucket.totalInss),
      totalIrrf: round2(bucket.totalIrrf),
      totalFgts: round2(bucket.totalFgts),
      totalVt: round2(bucket.totalVt),
      totalBenefits: round2(bucket.totalBenefits),
      totalNet: round2(bucket.totalNet),
    });

    const consolidated = round({
      count: payroll.count + thirteenthSalary.count + vacation.count,
      totalGross: payroll.totalGross + thirteenthSalary.totalGross + vacation.totalGross,
      totalInss: payroll.totalInss + thirteenthSalary.totalInss + vacation.totalInss,
      totalIrrf: payroll.totalIrrf + thirteenthSalary.totalIrrf + vacation.totalIrrf,
      totalFgts: payroll.totalFgts + thirteenthSalary.totalFgts + vacation.totalFgts,
      totalVt: payroll.totalVt,
      totalBenefits: payroll.totalBenefits,
      totalNet: payroll.totalNet + thirteenthSalary.totalNet + vacation.totalNet,
    });

    return {
      year,
      month,
      payroll: round(payroll),
      thirteenthSalary: round(thirteenthSalary),
      vacation: round(vacation),
      consolidated,
    };
  }
}
