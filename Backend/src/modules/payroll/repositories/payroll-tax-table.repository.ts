import { Injectable } from '@nestjs/common';
import { PayrollTaxTable, Prisma } from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';

const includeRelations = {
  brackets: { orderBy: { order: 'asc' } },
} satisfies Prisma.PayrollTaxTableInclude;

@Injectable()
export class PayrollTaxTableRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    companyId: string,
    data: Omit<Prisma.PayrollTaxTableUncheckedCreateInput, 'companyId'>,
  ): Promise<PayrollTaxTable> {
    return this.prisma.payrollTaxTable.create({
      data: { ...data, companyId },
      include: includeRelations,
    });
  }

  async findAll(companyId: string) {
    return this.prisma.payrollTaxTable.findMany({
      where: { companyId },
      include: includeRelations,
      orderBy: { validFrom: 'desc' },
    });
  }

  async findById(companyId: string, id: string) {
    return this.prisma.payrollTaxTable.findFirst({
      where: { id, companyId },
      include: includeRelations,
    });
  }

  /** Vigente numa data — validFrom <= data e (validTo é nulo ou >= data). */
  async findActiveAt(companyId: string, referenceDate: Date) {
    return this.prisma.payrollTaxTable.findFirst({
      where: {
        companyId,
        active: true,
        validFrom: { lte: referenceDate },
        OR: [{ validTo: null }, { validTo: { gte: referenceDate } }],
      },
      include: includeRelations,
      orderBy: { validFrom: 'desc' },
    });
  }

  /** Fecha a vigência em aberto anterior quando uma nova tabela é criada. */
  async closeOpenTable(companyId: string, validTo: Date) {
    return this.prisma.payrollTaxTable.updateMany({
      where: { companyId, active: true, validTo: null },
      data: { validTo, active: false },
    });
  }

  async update(
    id: string,
    data: Prisma.PayrollTaxTableUncheckedUpdateInput,
  ): Promise<PayrollTaxTable> {
    return this.prisma.payrollTaxTable.update({
      where: { id },
      data,
      include: includeRelations,
    });
  }
}
