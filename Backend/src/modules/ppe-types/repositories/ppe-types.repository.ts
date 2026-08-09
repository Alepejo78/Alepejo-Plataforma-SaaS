import { Injectable } from '@nestjs/common';
import { Prisma, PpeType } from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';

import { CreatePpeTypeDto } from '../dto/create-ppe-type.dto';
import { UpdatePpeTypeDto } from '../dto/update-ppe-type.dto';
import { PpeTypeFilterDto } from '../dto/ppe-type-filter.dto';

@Injectable()
export class PpeTypesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    companyId: string,
    data: CreatePpeTypeDto,
  ): Promise<PpeType> {
    return this.prisma.ppeType.create({
      data: {
        ...data,
        companyId,
      },
    });
  }

  async findById(
    companyId: string,
    id: string,
  ): Promise<PpeType | null> {
    return this.prisma.ppeType.findFirst({
      where: { id, companyId },
    });
  }

  async findByName(
    companyId: string,
    name: string,
  ): Promise<PpeType | null> {
    return this.prisma.ppeType.findFirst({
      where: { companyId, name },
    });
  }

  async findAll(companyId: string, filter: PpeTypeFilterDto) {
    const { search, page, limit, orderBy, order } = filter;

    const where: Prisma.PpeTypeWhereInput = {
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
      this.prisma.ppeType.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [orderBy]: order },
      }),

      this.prisma.ppeType.count({ where }),
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
    data: UpdatePpeTypeDto,
  ): Promise<PpeType> {
    return this.prisma.ppeType.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<PpeType> {
    return this.prisma.ppeType.update({
      where: { id },
      data: { active: false },
    });
  }

  /** Quantas funções usam este tipo de EPI. */
  async countJobFunctions(ppeTypeId: string): Promise<number> {
    return this.prisma.jobFunction.count({
      where: { ppeTypes: { some: { id: ppeTypeId } } },
    });
  }

  async restore(
    id: string,
    data: CreatePpeTypeDto,
  ): Promise<PpeType> {
    return this.prisma.ppeType.update({
      where: { id },
      data: {
        ...data,
        active: true,
      },
    });
  }
}
