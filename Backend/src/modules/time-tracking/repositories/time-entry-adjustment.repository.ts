import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';

interface Snapshot {
  start: Date | null;
  breakStart: Date | null;
  breakEnd: Date | null;
  end: Date | null;
}

@Injectable()
export class TimeEntryAdjustmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    companyId: string,
    employeeId: string,
    date: Date,
    before: Snapshot,
    after: Snapshot,
    justification: string,
    adjustedByUserId: string,
  ) {
    return this.prisma.timeEntryAdjustment.create({
      data: {
        companyId,
        employeeId,
        date,
        beforeStart: before.start,
        beforeBreakStart: before.breakStart,
        beforeBreakEnd: before.breakEnd,
        beforeEnd: before.end,
        afterStart: after.start,
        afterBreakStart: after.breakStart,
        afterBreakEnd: after.breakEnd,
        afterEnd: after.end,
        justification,
        adjustedByUserId,
      },
    });
  }

  async findAll(
    companyId: string,
    filter: { employeeId?: string; from?: Date; to?: Date },
  ) {
    const where: Prisma.TimeEntryAdjustmentWhereInput = {
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
    };

    return this.prisma.timeEntryAdjustment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }
}
