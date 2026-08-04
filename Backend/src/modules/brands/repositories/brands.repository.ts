import { Injectable } from '@nestjs/common';
import { Brand, Prisma } from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';

import { CreateBrandDto } from '../dto/create-brand.dto';
import { UpdateBrandDto } from '../dto/update-brand.dto';
import { BrandFilterDto } from '../dto/brand-filter.dto';

@Injectable()
export class BrandsRepository {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(data: CreateBrandDto): Promise<Brand> {
    return this.prisma.brand.create({
      data: {
        companyId: data.companyId,
        name: data.name,
        active: data.active,
      },
    });
  }

  async findById(id: string): Promise<Brand | null> {
    return this.prisma.brand.findUnique({
      where: {
        id,
      },
    });
  }

  async findByName(
    companyId: string,
    name: string,
  ): Promise<Brand | null> {
    return this.prisma.brand.findFirst({
      where: {
        companyId,
        name,
      },
    });
  }

  async findAll(filter: BrandFilterDto) {
    const {
      companyId,
      search,
      page,
      limit,
      orderBy,
      order,
    } = filter;

    const where: Prisma.BrandWhereInput = {
      companyId,
      ...(search
        ? {
            name: {
              contains: search,
              mode: Prisma.QueryMode.insensitive,
            },
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.brand.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          [orderBy]: order,
        },
      }),
      this.prisma.brand.count({
        where,
      }),
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
    data: UpdateBrandDto,
  ): Promise<Brand> {
    return this.prisma.brand.update({
      where: {
        id,
      },
      data: {
        ...(data.name !== undefined && {
          name: data.name,
        }),
        ...(data.active !== undefined && {
          active: data.active,
        }),
      },
    });
  }

  async delete(id: string): Promise<Brand> {
    return this.prisma.brand.update({
      where: {
        id,
      },
      data: {
        active: false,
      },
    });
  }
}