import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../core/prisma/prisma.service';

@Injectable()
export class VacationPeriodRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByEmployee(companyId: string, employeeId: string) {
    return this.prisma.vacationPeriod.findMany({
      where: { companyId, employeeId },
      orderBy: { startDate: 'asc' },
    });
  }

  async findOpen(employeeId: string) {
    return this.prisma.vacationPeriod.findFirst({
      where: { employeeId, status: 'OPEN' },
      orderBy: { startDate: 'asc' },
    });
  }

  async findLast(employeeId: string) {
    return this.prisma.vacationPeriod.findFirst({
      where: { employeeId },
      orderBy: { startDate: 'desc' },
    });
  }

  async create(companyId: string, employeeId: string, startDate: Date, endDate: Date, concessiveDeadline: Date) {
    return this.prisma.vacationPeriod.create({
      data: { companyId, employeeId, startDate, endDate, concessiveDeadline },
    });
  }

  async findById(companyId: string, id: string) {
    return this.prisma.vacationPeriod.findFirst({ where: { id, companyId } });
  }
}
