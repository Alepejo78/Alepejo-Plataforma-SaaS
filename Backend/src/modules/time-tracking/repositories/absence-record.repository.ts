import { Injectable } from '@nestjs/common';
import { AbsenceStatus, AbsenceType, Prisma } from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';

import { CreateAbsenceRecordDto } from '../dto/create-absence-record.dto';
import { AbsenceFilterDto } from '../dto/absence-filter.dto';

const includeRelations = {
  employee: {
    select: { id: true, name: true },
  },
};

@Injectable()
export class AbsenceRecordRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(companyId: string, dto: CreateAbsenceRecordDto) {
    return this.prisma.absenceRecord.create({
      data: {
        companyId,
        employeeId: dto.employeeId,
        date: new Date(dto.date),
        type: dto.type,
        reason: dto.reason,
      },
      include: includeRelations,
    });
  }

  async findAll(companyId: string, filter: AbsenceFilterDto) {
    const where: Prisma.AbsenceRecordWhereInput = {
      companyId,
      ...(filter.employeeId && {
        employeeId: filter.employeeId,
      }),
      ...(filter.type && { type: filter.type }),
      ...(filter.status && { status: filter.status }),
      ...((filter.from || filter.to) && {
        date: {
          ...(filter.from && { gte: new Date(filter.from) }),
          ...(filter.to && {
            lte: new Date(
              new Date(filter.to).getTime() +
                24 * 60 * 60 * 1000 -
                1,
            ),
          }),
        },
      }),
    };

    return this.prisma.absenceRecord.findMany({
      where,
      include: includeRelations,
      orderBy: { date: 'desc' },
    });
  }

  async findById(companyId: string, id: string) {
    return this.prisma.absenceRecord.findFirst({
      where: { id, companyId },
      include: includeRelations,
    });
  }

  async update(
    id: string,
    dto: {
      employeeId?: string;
      date?: Date;
      type?: AbsenceType;
      reason?: string;
    },
  ) {
    return this.prisma.absenceRecord.update({
      where: { id },
      data: {
        ...(dto.employeeId && { employeeId: dto.employeeId }),
        ...(dto.date && { date: dto.date }),
        ...(dto.type && { type: dto.type }),
        ...(dto.reason !== undefined && { reason: dto.reason }),
      },
      include: includeRelations,
    });
  }

  async delete(id: string) {
    await this.prisma.absenceRecord.delete({ where: { id } });
  }

  async setStatus(
    id: string,
    status: AbsenceStatus,
    approvedByUserId?: string,
  ) {
    return this.prisma.absenceRecord.update({
      where: { id },
      data: {
        status,
        approvedByUserId:
          status === AbsenceStatus.PENDENTE
            ? null
            : approvedByUserId,
        approvedAt:
          status === AbsenceStatus.PENDENTE ? null : new Date(),
      },
      include: includeRelations,
    });
  }
}
