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

  async create(companyId: string, data: CreateBrandDto): Promise<Brand> {
    return this.prisma.brand.create({
      data: {
        companyId,
        name: data.name,
        active: data.active,
      },
    });
  }

  async findById(companyId: string, id: string): Promise<Brand | null> {
    return this.prisma.brand.findFirst({
      where: {
        id,
        companyId,
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

  async findAll(companyId: string, filter: BrandFilterDto) {
    const {
      search,
      page,
      limit,
      orderBy,
      order,
    } = filter;

    const where: Prisma.BrandWhereInput = {
      companyId,
      active: true,
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

  // Observação: Prisma só aceita campos únicos em `where` de update().
  // A checagem de que `id` pertence a `companyId` é feita no service
  // (via findById) ANTES de chamar estes métodos.
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

  /** Quantos produtos ativos usam esta marca — produto excluído (soft delete) não conta. */
  async countProducts(brandId: string): Promise<number> {
    return this.prisma.product.count({
      where: { brandId, deletedAt: null },
    });
  }

  /**
   * Reativa uma marca excluída (soft delete) com o mesmo nome,
   * em vez de criar uma linha nova (o índice único de companyId+name
   * não exclui marcas inativas, então um create() colidiria).
   */
  async restore(id: string, data: CreateBrandDto): Promise<Brand> {
    return this.prisma.brand.update({
      where: { id },
      data: {
        name: data.name,
        active: true,
      },
    });
  }
}
