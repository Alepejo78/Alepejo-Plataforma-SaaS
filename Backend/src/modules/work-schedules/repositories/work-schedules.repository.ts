import { Injectable } from '@nestjs/common';
import { Prisma, WorkSchedule } from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';

import { CreateWorkScheduleDto } from '../dto/create-work-schedule.dto';
import { UpdateWorkScheduleDto } from '../dto/update-work-schedule.dto';
import { WorkScheduleFilterDto } from '../dto/work-schedule-filter.dto';

@Injectable()
export class WorkSchedulesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    companyId: string,
    data: CreateWorkScheduleDto,
  ): Promise<WorkSchedule> {
    return this.prisma.workSchedule.create({
      data: {
        ...data,
        companyId,
      },
    });
  }

  async findById(
    companyId: string,
    id: string,
  ): Promise<WorkSchedule | null> {
    return this.prisma.workSchedule.findFirst({
      where: { id, companyId },
    });
  }

  async findByName(
    companyId: string,
    name: string,
  ): Promise<WorkSchedule | null> {
    return this.prisma.workSchedule.findFirst({
      where: { companyId, name },
    });
  }

  async findAll(
    companyId: string,
    filter: WorkScheduleFilterDto,
  ) {
    const { search, page, limit, orderBy, order } = filter;

    const where: Prisma.WorkScheduleWhereInput = {
      companyId,
      active: true,

      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          {
            description: {
              contains: search,
              mode: 'insensitive',
            },
          },
        ],
      }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.workSchedule.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [orderBy]: order },
      }),

      this.prisma.workSchedule.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  async update(
    id: string,
    data: UpdateWorkScheduleDto,
  ): Promise<WorkSchedule> {
    return this.prisma.workSchedule.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<WorkSchedule> {
    return this.prisma.workSchedule.update({
      where: { id },
      data: { active: false },
    });
  }

  /** Quantas funções usam este horário. */
  async countJobFunctions(
    workScheduleId: string,
  ): Promise<number> {
    return this.prisma.jobFunction.count({
      where: { workScheduleId },
    });
  }

  async restore(
    id: string,
    data: CreateWorkScheduleDto,
  ): Promise<WorkSchedule> {
    return this.prisma.workSchedule.update({
      where: { id },
      data: {
        ...data,
        active: true,
      },
    });
  }
}
