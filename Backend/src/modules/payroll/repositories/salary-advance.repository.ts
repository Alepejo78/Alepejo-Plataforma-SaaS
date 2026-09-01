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
      email: true,
      mobile: true,
      admissionDate: true,
      bankName: true,
      bankAgency: true,
      bankAccount: true,
      paymentMethod: true,
      jobFunction: { select: { id: true, name: true } },
    },
  },
  financialEntry: { select: { id: true, status: true, dueDate: true } },
};

@Injectable()
export class SalaryAdvanceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.SalaryAdvanceUncheckedCreateInput) {
    return this.prisma.salaryAdvance.create({
      data,
      include: includeRelations,
    });
  }

  async findAll(companyId: string, filter: { employeeId?: string; status?: PayrollStatus }) {
    const where: Prisma.SalaryAdvanceWhereInput = {
      companyId,
      ...(filter.employeeId && { employeeId: filter.employeeId }),
      ...(filter.status && { status: filter.status }),
    };

    return this.prisma.salaryAdvance.findMany({
      where,
      include: includeRelations,
      orderBy: { requestDate: 'desc' },
    });
  }

  async findById(companyId: string, id: string) {
    return this.prisma.salaryAdvance.findFirst({
      where: { id, companyId },
      include: includeRelations,
    });
  }

  async update(id: string, data: Prisma.SalaryAdvanceUncheckedUpdateInput) {
    return this.prisma.salaryAdvance.update({
      where: { id },
      data,
      include: includeRelations,
    });
  }
}
