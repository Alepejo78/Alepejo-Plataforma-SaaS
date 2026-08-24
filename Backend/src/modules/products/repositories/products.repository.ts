import { Injectable } from '@nestjs/common';
import { Prisma, Product } from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';

import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { ProductFilterDto } from '../dto/product-filter.dto';

@Injectable()
export class ProductsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(companyId: string, data: CreateProductDto): Promise<Product> {
    return this.prisma.product.create({
      data: {
        ...data,
        companyId,
      },
    });
  }

  async findById(companyId: string, id: string): Promise<Product | null> {
    return this.prisma.product.findFirst({
      where: { id, companyId },
      include: {
        category: true,
        brand: true,
        unit: true,
        chartOfAccount: true,
      },
    });
  }

  async findByCode(
    companyId: string,
    code: string,
  ): Promise<Product | null> {
    return this.prisma.product.findFirst({
      where: {
        companyId,
        code,
        deletedAt: null,
      },
    });
  }

  async findAll(companyId: string, filter: ProductFilterDto) {
    const {
      search,
      barcode,
      categoryId,
      brandId,
      unitId,
      type,
      status,
      inventoryControl,
      page,
      limit,
      orderBy,
      order,
    } = filter;

    const where: Prisma.ProductWhereInput = {
      companyId,
      deletedAt: null,

      ...(search && {
        OR: [
          {
            description: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            code: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            barcode: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            reference: {
              contains: search,
              mode: 'insensitive',
            },
          },
        ],
      }),

      ...(barcode && { barcode }),
      ...(categoryId && { categoryId }),
      ...(brandId && { brandId }),
      ...(unitId && { unitId }),
      ...(type && { type }),
      ...(status && { status }),
      ...(inventoryControl && { inventoryControl }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        include: {
          category: true,
          brand: true,
          unit: true,
          chartOfAccount: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          [orderBy]: order,
        },
      }),

      this.prisma.product.count({
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
    data: UpdateProductDto,
  ): Promise<Product> {
    return this.prisma.product.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<Product> {
    return this.prisma.product.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        active: false,
      },
    });
  }
}
