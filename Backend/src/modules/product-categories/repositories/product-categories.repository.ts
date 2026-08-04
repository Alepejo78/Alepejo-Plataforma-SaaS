import { Injectable } from '@nestjs/common';
import { Prisma, ProductCategory } from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';

import { CreateProductCategoryDto } from '../dto/create-product-category.dto';
import { UpdateProductCategoryDto } from '../dto/update-product-category.dto';
import { ProductCategoryFilterDto } from '../dto/product-category-filter.dto';

@Injectable()
export class ProductCategoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    companyId: string,
    data: CreateProductCategoryDto,
  ): Promise<ProductCategory> {
    return this.prisma.productCategory.create({
      data: {
        ...data,
        companyId,
      },
    });
  }

  async findById(
    companyId: string,
    id: string,
  ): Promise<ProductCategory | null> {
    return this.prisma.productCategory.findFirst({
      where: { id, companyId },
    });
  }

  async findByName(
    companyId: string,
    name: string,
  ): Promise<ProductCategory | null> {
    return this.prisma.productCategory.findFirst({
      where: {
        companyId,
        name,
      },
    });
  }

  async findAll(companyId: string, filter: ProductCategoryFilterDto) {
    const {
      search,
      page,
      limit,
      orderBy,
      order,
    } = filter;

    const where: Prisma.ProductCategoryWhereInput = {
      companyId,

      ...(search && {
        OR: [
          {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          },
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
      this.prisma.productCategory.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          [orderBy]: order,
        },
      }),

      this.prisma.productCategory.count({
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
    data: UpdateProductCategoryDto,
  ): Promise<ProductCategory> {
    return this.prisma.productCategory.update({
      where: { id },
      data,
    });
  }

  async delete(
    id: string,
  ): Promise<ProductCategory> {
    return this.prisma.productCategory.update({
      where: { id },
      data: {
        active: false,
      },
    });
  }
}
