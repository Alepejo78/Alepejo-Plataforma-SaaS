import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';

const itemInclude = {
  employee: {
    select: {
      id: true,
      name: true,
      employeeNumber: true,
      cpf: true,
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
export class ThirteenthSalaryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId: string, filter: { year?: number; installment?: number }) {
    const where: Prisma.ThirteenthSalaryWhereInput = {
      companyId,
      ...(filter.year && { year: filter.year }),
      ...(filter.installment && { installment: filter.installment }),
    };

    return this.prisma.thirteenthSalary.findMany({
      where,
      include: { items: { select: { id: true, status: true, netAmount: true } } },
      orderBy: [{ year: 'desc' }, { installment: 'desc' }],
    });
  }

  async findById(companyId: string, id: string) {
    return this.prisma.thirteenthSalary.findFirst({
      where: { id, companyId },
      include: includeRelations,
    });
  }

  async findExisting(companyId: string, year: number, installment: number) {
    return this.prisma.thirteenthSalary.findUnique({
      where: { companyId_year_installment: { companyId, year, installment } },
    });
  }

  /** Item incluído da 1ª parcela de um colaborador — usado pra calcular o desconto na 2ª. */
  async findFirstInstallmentItem(companyId: string, year: number, employeeId: string) {
    return this.prisma.thirteenthSalaryItem.findFirst({
      where: {
        employeeId,
        status: { not: 'EXCLUDED' },
        thirteenthSalary: { companyId, year, installment: 1 },
      },
    });
  }

  async findItem(companyId: string, thirteenthSalaryId: string, itemId: string) {
    return this.prisma.thirteenthSalaryItem.findFirst({
      where: { id: itemId, thirteenthSalaryId, thirteenthSalary: { companyId } },
      include: itemInclude,
    });
  }

  async recalculateHeaderTotals(tx: Prisma.TransactionClient, thirteenthSalaryId: string) {
    const items = await tx.thirteenthSalaryItem.findMany({
      where: { thirteenthSalaryId, status: { not: 'EXCLUDED' } },
    });

    const totals = items.reduce(
      (acc, item) => ({
        totalGross: acc.totalGross + Number(item.grossAmount),
        totalDeductions:
          acc.totalDeductions +
          Number(item.inssAmount) +
          Number(item.irrfAmount) +
          Number(item.previousInstallmentAmount) +
          Number(item.otherDeductions),
        totalNet: acc.totalNet + Number(item.netAmount),
        totalEmployerFgts: acc.totalEmployerFgts + Number(item.employerFgtsAmount),
      }),
      { totalGross: 0, totalDeductions: 0, totalNet: 0, totalEmployerFgts: 0 },
    );

    return tx.thirteenthSalary.update({ where: { id: thirteenthSalaryId }, data: totals });
  }

  async approve(id: string, approvedByUserId: string) {
    return this.prisma.thirteenthSalary.update({
      where: { id },
      data: { status: 'APPROVED', approvedAt: new Date(), approvedByUserId },
      include: includeRelations,
    });
  }

  async cancel(id: string) {
    return this.prisma.thirteenthSalary.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: includeRelations,
    });
  }
}
