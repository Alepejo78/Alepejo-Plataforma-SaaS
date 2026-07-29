import { Injectable } from '@nestjs/common';
import { Prisma, Supplier } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class SupplierRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.SupplierCreateInput): Promise<Supplier> {
    return this.prisma.supplier.create({
      data,
    });
  }

  async findById(id: string): Promise<Supplier | null> {
    return this.prisma.supplier.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });
  }

  async findByDocument(
    companyId: string,
    document: string,
  ): Promise<Supplier | null> {
    return this.prisma.supplier.findFirst({
      where: {
        companyId,
        document,
        deletedAt: null,
      },
    });
  }

  async findAll(
    companyId: string,
    skip: number,
    take: number,
    search?: string,
  ) {
    return this.prisma.supplier.findMany({
      where: {
        companyId,
        deletedAt: null,
        ...(search && {
          OR: [
            {
              corporateName: {
                contains: search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
            {
              tradeName: {
                contains: search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
            {
              document: {
                contains: search,
              },
            },
          ],
        }),
      },
      orderBy: {
        corporateName: 'asc',
      },
      skip,
      take,
    });
  }

  async count(companyId: string, search?: string): Promise<number> {
    return this.prisma.supplier.count({
      where: {
        companyId,
        deletedAt: null,
        ...(search && {
          OR: [
            {
              corporateName: {
                contains: search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
            {
              tradeName: {
                contains: search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
            {
              document: {
                contains: search,
              },
            },
          ],
        }),
      },
    });
  }

  async update(
    id: string,
    data: Prisma.SupplierUpdateInput,
  ): Promise<Supplier> {
    return this.prisma.supplier.update({
      where: {
        id,
      },
      data,
    });
  }

  async delete(id: string): Promise<Supplier> {
    return this.prisma.supplier.update({
      where: {
        id,
      },
      data: {
        deletedAt: new Date(),
      },
    });
  }
}