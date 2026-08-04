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
    data: CreateProductCategoryDto,
  ): Promise<ProductCategory> {
    return this.prisma.productCategory.create({
      data,
    });
  }

  async findById(
    id: string,
  ): Promise<ProductCategory | null> {
    return this.prisma.productCategory.findUnique({
      where: { id },
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

  async findAll(filter: ProductCategoryFilterDto) {
    const {
      companyId,
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