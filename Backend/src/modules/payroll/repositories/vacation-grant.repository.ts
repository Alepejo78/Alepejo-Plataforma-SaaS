import { Injectable } from '@nestjs/common';
import { PayrollStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';

const includeRelations = {
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
  vacationPeriod: true,
  lines: { orderBy: { sortOrder: 'asc' as const } },
  financialEntry: { select: { id: true, status: true, dueDate: true } },
};

@Injectable()
export class VacationGrantRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.VacationGrantUncheckedCreateInput) {
    return this.prisma.vacationGrant.create({
      data,
      include: includeRelations,
    });
  }

  async findAll(companyId: string, filter: { employeeId?: string; status?: PayrollStatus }) {
    const where: Prisma.VacationGrantWhereInput = {
      companyId,
      ...(filter.employeeId && { employeeId: filter.employeeId }),
      ...(filter.status && { status: filter.status }),
    };

    return this.prisma.vacationGrant.findMany({
      where,
      include: includeRelations,
      orderBy: { startDate: 'desc' },
    });
  }

  async findById(companyId: string, id: string) {
    return this.prisma.vacationGrant.findFirst({
      where: { id, companyId },
      include: includeRelations,
    });
  }

  async update(id: string, data: Prisma.VacationGrantUncheckedUpdateInput) {
    return this.prisma.vacationGrant.update({
      where: { id },
      data,
      include: includeRelations,
    });
  }
}
