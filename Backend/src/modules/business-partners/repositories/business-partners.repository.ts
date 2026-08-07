import { Injectable } from '@nestjs/common';
import {
  BusinessPartner,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';

import { CreateBusinessPartnerDto } from '../dto/create-business-partner.dto';
import { UpdateBusinessPartnerDto } from '../dto/update-business-partner.dto';
import { BusinessPartnerFilterDto } from '../dto/business-partner-filter.dto';

@Injectable()
export class BusinessPartnersRepository {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    companyId: string,
    data: CreateBusinessPartnerDto,
  ): Promise<BusinessPartner> {
    return this.prisma.businessPartner.create({
      data: {
        ...data,
        companyId,
      },
    });
  }

  async findById(
    companyId: string,
    id: string,
  ): Promise<BusinessPartner | null> {
    return this.prisma.businessPartner.findFirst({
      where: {
        id,
        companyId,
        deletedAt: null,
      },
    });
  }

  async findByDocument(
    companyId: string,
    document: string,
  ): Promise<BusinessPartner | null> {
    return this.prisma.businessPartner.findFirst({
      where: {
        companyId,
        document,
        deletedAt: null,
      },
    });
  }

  async findAll(
    companyId: string,
    filter: BusinessPartnerFilterDto,
  ) {
    const page = Number(filter.page ?? 1);
    const limit = Number(filter.limit ?? 20);

    const where: Prisma.BusinessPartnerWhereInput = {
      companyId,
      deletedAt: null,

      ...(filter.role && {
        roles: {
          has: filter.role,
        },
      }),

      ...(filter.status && {
        status: filter.status,
      }),

      ...(filter.search && {
        OR: [
          {
            legalName: {
              contains: filter.search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            tradeName: {
              contains: filter.search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            document: {
              contains: filter.search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            email: {
              contains: filter.search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
        ],
      }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.businessPartner.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          [filter.orderBy ?? 'legalName']:
            filter.order ?? 'asc',
        },
      }),

      this.prisma.businessPartner.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  /** Quantas vendas existem para este parceiro. */
  async countSales(partnerId: string): Promise<number> {
    return this.prisma.sale.count({
      where: { partnerId },
    });
  }

  /** Quantas compras existem para este parceiro. */
  async countPurchases(partnerId: string): Promise<number> {
    return this.prisma.purchase.count({
      where: { partnerId },
    });
  }

  // Observação: Prisma só aceita campos únicos em `where` de update().
  // A checagem de tenant é feita no service (findById) ANTES daqui.
  async update(
    id: string,
    data: UpdateBusinessPartnerDto,
  ): Promise<BusinessPartner> {
    return this.prisma.businessPartner.update({
      where: { id },
      data,
    });
  }

  async softDelete(id: string): Promise<BusinessPartner> {
    return this.prisma.businessPartner.update({
      where: { id },
      data: {
        active: false,
        deletedAt: new Date(),
      },
    });
  }
}
