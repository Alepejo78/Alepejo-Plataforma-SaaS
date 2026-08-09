import { Injectable } from '@nestjs/common';
import { JobFunction, Prisma } from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';

import { CreateJobFunctionDto } from '../dto/create-job-function.dto';
import { UpdateJobFunctionDto } from '../dto/update-job-function.dto';
import { JobFunctionFilterDto } from '../dto/job-function-filter.dto';

const includeRelations = {
  sector: true,
  workSchedule: true,
  ppeTypes: true,
} satisfies Prisma.JobFunctionInclude;

@Injectable()
export class JobFunctionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    companyId: string,
    dto: CreateJobFunctionDto,
    cboTitle: string | undefined,
  ): Promise<JobFunction> {
    return this.prisma.jobFunction.create({
      data: {
        companyId,
        name: dto.name,
        description: dto.description,
        cboCode: dto.cboCode,
        cboTitle,
        sectorId: dto.sectorId,
        baseSalary: dto.baseSalary,
        salaryType: dto.salaryType,
        workScheduleId: dto.workScheduleId,
        requiresPpe: dto.requiresPpe ?? false,
        active: dto.active ?? true,
        ppeTypes: dto.ppeTypeIds
          ? { connect: dto.ppeTypeIds.map((id) => ({ id })) }
          : undefined,
      },
      include: includeRelations,
    });
  }

  async findById(
    companyId: string,
    id: string,
  ): Promise<JobFunction | null> {
    return this.prisma.jobFunction.findFirst({
      where: { id, companyId },
      include: includeRelations,
    });
  }

  async findByName(
    companyId: string,
    name: string,
  ): Promise<JobFunction | null> {
    return this.prisma.jobFunction.findFirst({
      where: { companyId, name },
    });
  }

  async findAll(
    companyId: string,
    filter: JobFunctionFilterDto,
  ) {
    const { search, sectorId, page, limit, orderBy, order } =
      filter;

    const where: Prisma.JobFunctionWhereInput = {
      companyId,
      active: true,
      ...(sectorId && { sectorId }),

      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          {
            description: {
              contains: search,
              mode: 'insensitive',
            },
          },
          { cboCode: { contains: search, mode: 'insensitive' } },
          {
            cboTitle: {
              contains: search,
              mode: 'insensitive',
            },
          },
        ],
      }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.jobFunction.findMany({
        where,
        include: includeRelations,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [orderBy]: order },
      }),

      this.prisma.jobFunction.count({ where }),
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
    dto: UpdateJobFunctionDto,
    cboTitle: string | null | undefined,
  ): Promise<JobFunction> {
    return this.prisma.jobFunction.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        cboCode: dto.cboCode,
        // Só sobrescreve o título se o código foi enviado nesta
        // atualização (undefined = campo não veio, mantém o que já
        // estava; null viria de um cboCode limpo pelo usuário).
        ...(dto.cboCode !== undefined && { cboTitle }),
        sectorId: dto.sectorId,
        baseSalary: dto.baseSalary,
        salaryType: dto.salaryType,
        workScheduleId: dto.workScheduleId,
        requiresPpe: dto.requiresPpe,
        active: dto.active,
        ppeTypes: dto.ppeTypeIds
          ? { set: dto.ppeTypeIds.map((id) => ({ id })) }
          : undefined,
      },
      include: includeRelations,
    });
  }

  async delete(id: string): Promise<JobFunction> {
    return this.prisma.jobFunction.update({
      where: { id },
      data: { active: false },
    });
  }

  async restore(
    id: string,
    dto: CreateJobFunctionDto,
    cboTitle: string | undefined,
  ): Promise<JobFunction> {
    return this.prisma.jobFunction.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        cboCode: dto.cboCode,
        cboTitle,
        sectorId: dto.sectorId,
        baseSalary: dto.baseSalary,
        salaryType: dto.salaryType,
        workScheduleId: dto.workScheduleId,
        requiresPpe: dto.requiresPpe ?? false,
        active: true,
        ppeTypes: {
          set: (dto.ppeTypeIds ?? []).map((id) => ({ id })),
        },
      },
      include: includeRelations,
    });
  }
}
