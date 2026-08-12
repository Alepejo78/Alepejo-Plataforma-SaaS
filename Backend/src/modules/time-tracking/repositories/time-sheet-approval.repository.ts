import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../core/prisma/prisma.service';

@Injectable()
export class TimeSheetApprovalRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    companyId: string,
    filter: { employeeId?: string; from?: Date; to?: Date },
  ) {
    return this.prisma.timeSheetApproval.findMany({
      where: {
        companyId,
        ...(filter.employeeId && {
          employeeId: filter.employeeId,
        }),
        ...((filter.from || filter.to) && {
          date: {
            ...(filter.from && { gte: filter.from }),
            ...(filter.to && { lte: filter.to }),
          },
        }),
      },
    });
  }

  async find(companyId: string, employeeId: string, date: Date) {
    return this.prisma.timeSheetApproval.findUnique({
      where: {
        companyId_employeeId_date: {
          companyId,
          employeeId,
          date,
        },
      },
    });
  }

  async upsert(
    companyId: string,
    employeeId: string,
    date: Date,
    workedMinutes: number,
    approvedByUserId?: string,
  ) {
    return this.prisma.timeSheetApproval.upsert({
      where: {
        companyId_employeeId_date: {
          companyId,
          employeeId,
          date,
        },
      },
      update: { workedMinutes, approvedByUserId },
      create: {
        companyId,
        employeeId,
        date,
        workedMinutes,
        approvedByUserId,
      },
    });
  }

  async delete(companyId: string, employeeId: string, date: Date) {
    await this.prisma.timeSheetApproval.deleteMany({
      where: { companyId, employeeId, date },
    });
  }
}
