import { Injectable } from '@nestjs/common';
import { Prisma, TimeEntrySource } from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';

const includeRelations = {
  employee: {
    select: { id: true, name: true, workScheduleId: true },
  },
};

@Injectable()
export class TimeEntryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    companyId: string,
    data: {
      employeeId: string;
      timestamp: Date;
      source?: TimeEntrySource;
      observation?: string;
    },
  ) {
    return this.prisma.timeEntry.create({
      data: {
        companyId,
        employeeId: data.employeeId,
        timestamp: data.timestamp,
        source: data.source ?? TimeEntrySource.MANUAL,
        observation: data.observation,
      },
      include: includeRelations,
    });
  }

  async findAll(
    companyId: string,
    filter: { employeeId?: string; from?: Date; to?: Date },
  ) {
    const where: Prisma.TimeEntryWhereInput = {
      companyId,
      ...(filter.employeeId && {
        employeeId: filter.employeeId,
      }),
      ...((filter.from || filter.to) && {
        timestamp: {
          ...(filter.from && { gte: filter.from }),
          ...(filter.to && { lte: filter.to }),
        },
      }),
    };

    return this.prisma.timeEntry.findMany({
      where,
      include: includeRelations,
      orderBy: { timestamp: 'asc' },
    });
  }

  async findById(companyId: string, id: string) {
    return this.prisma.timeEntry.findFirst({
      where: { id, companyId },
    });
  }

  async delete(id: string) {
    return this.prisma.timeEntry.delete({ where: { id } });
  }

  /** Apaga todas as batidas de um colaborador num dia — usado pelo ajuste manual (substitui o dia inteiro). */
  async deleteForDay(
    companyId: string,
    employeeId: string,
    dayStart: Date,
    dayEnd: Date,
  ) {
    await this.prisma.timeEntry.deleteMany({
      where: {
        companyId,
        employeeId,
        timestamp: { gte: dayStart, lte: dayEnd },
      },
    });
  }

  async createMany(
    companyId: string,
    employeeId: string,
    entries: { timestamp: Date; source: TimeEntrySource }[],
  ) {
    if (entries.length === 0) {
      return;
    }

    await this.prisma.timeEntry.createMany({
      data: entries.map((entry) => ({
        companyId,
        employeeId,
        timestamp: entry.timestamp,
        source: entry.source,
      })),
    });
  }
}
