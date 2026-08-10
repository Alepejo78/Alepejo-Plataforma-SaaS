import { Injectable } from '@nestjs/common';
import { Prisma, Benefit } from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';

import { CreateBenefitDto } from '../dto/create-benefit.dto';
import { UpdateBenefitDto } from '../dto/update-benefit.dto';
import { BenefitFilterDto } from '../dto/benefit-filter.dto';

@Injectable()
export class BenefitsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    companyId: string,
    data: CreateBenefitDto,
  ): Promise<Benefit> {
    return this.prisma.benefit.create({
      data: {
        ...data,
        companyId,
      },
    });
  }

  async findById(
    companyId: string,
    id: string,
  ): Promise<Benefit | null> {
    return this.prisma.benefit.findFirst({
      where: { id, companyId },
    });
  }

  async findByName(
    companyId: string,
    name: string,
  ): Promise<Benefit | null> {
    return this.prisma.benefit.findFirst({
      where: { companyId, name },
    });
  }

  async findAll(companyId: string, filter: BenefitFilterDto) {
    const { search, page, limit, orderBy, order } = filter;

    const where: Prisma.BenefitWhereInput = {
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
      this.prisma.benefit.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [orderBy]: order },
      }),

      this.prisma.benefit.count({ where }),
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
    data: UpdateBenefitDto,
  ): Promise<Benefit> {
    return this.prisma.benefit.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<Benefit> {
    return this.prisma.benefit.update({
      where: { id },
      data: { active: false },
    });
  }

  /** Quantos colaboradores têm este benefício concedido. */
  async countEmployeeBenefits(benefitId: string): Promise<number> {
    return this.prisma.employeeBenefit.count({
      where: { benefitId },
    });
  }

  async restore(
    id: string,
    data: CreateBenefitDto,
  ): Promise<Benefit> {
    return this.prisma.benefit.update({
      where: { id },
      data: {
        ...data,
        active: true,
      },
    });
  }
}
