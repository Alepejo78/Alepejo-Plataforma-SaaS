import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../core/prisma/prisma.service';

import { CreateWorkScheduleShiftDto } from '../dto/create-work-schedule-shift.dto';
import { UpdateWorkScheduleShiftDto } from '../dto/update-work-schedule-shift.dto';

@Injectable()
export class WorkScheduleShiftRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    companyId: string,
    workScheduleId: string,
    dto: CreateWorkScheduleShiftDto,
  ) {
    return this.prisma.workScheduleShift.create({
      data: {
        companyId,
        workScheduleId,
        ...dto,
      },
    });
  }

  async findAll(companyId: string, workScheduleId: string) {
    return this.prisma.workScheduleShift.findMany({
      where: { companyId, workScheduleId },
      orderBy: { dayFrom: 'asc' },
    });
  }

  async findById(companyId: string, id: string) {
    return this.prisma.workScheduleShift.findFirst({
      where: { id, companyId },
    });
  }

  async update(id: string, dto: UpdateWorkScheduleShiftDto) {
    return this.prisma.workScheduleShift.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: string) {
    await this.prisma.workScheduleShift.delete({ where: { id } });
  }
}
