import { Injectable } from '@nestjs/common';
import { Prisma, Quotation } from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';

import { CreateQuotationDto } from '../dto/create-quotation.dto';
import { QuotationFilterDto } from '../dto/quotation-filter.dto';

const includeRelations = {
  warehouse: true,
  items: {
    include: { product: true },
  },
  offers: {
    include: {
      partner: true,
      items: {
        include: { product: true },
      },
      purchaseOrder: true,
    },
  },
};

@Injectable()
export class QuotationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    tx: Prisma.TransactionClient,
    companyId: string,
    number: number,
    dto: CreateQuotationDto,
  ): Promise<Quotation> {
    return tx.quotation.create({
      data: {
        companyId,
        number,
        warehouseId: dto.warehouseId,
        quotationDate: dto.quotationDate
          ? new Date(dto.quotationDate)
          : undefined,
        observation: dto.observation,
        items: {
          create: dto.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        },
      },
      include: includeRelations,
    });
  }

  async findAll(
    companyId: string,
    filter: QuotationFilterDto,
  ) {
    const where: Prisma.QuotationWhereInput = {
      companyId,
      ...(filter.warehouseId && {
        warehouseId: filter.warehouseId,
      }),
      ...(filter.status && { status: filter.status }),
    };

    return this.prisma.quotation.findMany({
      where,
      include: includeRelations,
      orderBy: { number: 'desc' },
    });
  }

  async findById(companyId: string, id: string) {
    return this.prisma.quotation.findFirst({
      where: { id, companyId },
      include: includeRelations,
    });
  }

  async update(
    id: string,
    dto: {
      warehouseId?: string;
      quotationDate?: Date;
      observation?: string;
      items?: { productId: string; quantity: number }[];
    },
  ): Promise<Quotation> {
    return this.prisma.quotation.update({
      where: { id },
      data: {
        ...(dto.warehouseId && {
          warehouseId: dto.warehouseId,
        }),
        ...(dto.quotationDate !== undefined && {
          quotationDate: dto.quotationDate,
        }),
        ...(dto.observation !== undefined && {
          observation: dto.observation,
        }),
        ...(dto.items && {
          items: {
            deleteMany: {},
            create: dto.items,
          },
        }),
      },
      include: includeRelations,
    });
  }

  async cancel(id: string): Promise<Quotation> {
    return this.prisma.quotation.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }
}
