import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';

import { PayrollFilterDto } from '../dto/payroll-filter.dto';

const itemInclude = {
  employee: {
    select: {
      id: true,
      name: true,
      employeeNumber: true,
      cpf: true,
      email: true,
      mobile: true,
      admissionDate: true,
      bankName: true,
      bankAgency: true,
      bankAccount: true,
      jobFunction: { select: { id: true, name: true } },
    },
  },
  lines: { orderBy: { sortOrder: 'asc' as const } },
  financialEntry: { select: { id: true, status: true, dueDate: true } },
};

const includeRelations = {
  items: {
    include: itemInclude,
    orderBy: { createdAt: 'asc' as const },
  },
};

@Injectable()
export class PayrollRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId: string, filter: PayrollFilterDto) {
    const where: Prisma.PayrollWhereInput = {
      companyId,
      ...(filter.competenceYear && { competenceYear: filter.competenceYear }),
      ...(filter.competenceMonth && { competenceMonth: filter.competenceMonth }),
      ...(filter.status && { status: filter.status }),
    };

    return this.prisma.payroll.findMany({
      where,
      include: { items: { select: { id: true, status: true, netAmount: true } } },
      orderBy: [{ competenceYear: 'desc' }, { competenceMonth: 'desc' }],
    });
  }

  async findById(companyId: string, id: string) {
    return this.prisma.payroll.findFirst({
      where: { id, companyId },
      include: includeRelations,
    });
  }

  async findExisting(companyId: string, competenceYear: number, competenceMonth: number) {
    return this.prisma.payroll.findUnique({
      where: { companyId_competenceYear_competenceMonth: { companyId, competenceYear, competenceMonth } },
    });
  }

  async findItem(companyId: string, payrollId: string, itemId: string) {
    return this.prisma.payrollItem.findFirst({
      where: { id: itemId, payrollId, payroll: { companyId } },
      include: itemInclude,
    });
  }

  async updateItem(itemId: string, data: Prisma.PayrollItemUncheckedUpdateInput) {
    return this.prisma.payrollItem.update({
      where: { id: itemId },
      data,
      include: itemInclude,
    });
  }

  async recalculateHeaderTotals(tx: Prisma.TransactionClient, payrollId: string) {
    const items = await tx.payrollItem.findMany({
      where: { payrollId, status: { not: 'EXCLUDED' } },
    });

    const totals = items.reduce(
      (acc, item) => ({
        totalGross: acc.totalGross + Number(item.grossAmount),
        totalDeductions:
          acc.totalDeductions +
          Number(item.inssAmount) +
          Number(item.irrfAmount) +
          Number(item.absenceDeductionAmount) +
          Number(item.transportVoucherDeduction) +
          Number(item.benefitDeductions) +
          Number(item.otherDeductions),
        totalNet: acc.totalNet + Number(item.netAmount),
        totalEmployerFgts: acc.totalEmployerFgts + Number(item.employerFgtsAmount),
      }),
      { totalGross: 0, totalDeductions: 0, totalNet: 0, totalEmployerFgts: 0 },
    );

    return tx.payroll.update({ where: { id: payrollId }, data: totals });
  }

  async approve(id: string, approvedByUserId: string) {
    return this.prisma.payroll.update({
      where: { id },
      data: { status: 'APPROVED', approvedAt: new Date(), approvedByUserId },
      include: includeRelations,
    });
  }

  async cancel(id: string) {
    return this.prisma.payroll.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: includeRelations,
    });
  }
}
