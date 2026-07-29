import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../core/prisma/prisma.service';

import { Prisma } from '@prisma/client';

import { CreateClientDto } from '../dto/create-client.dto';
import { UpdateClientDto } from '../dto/update-client.dto';
import { ClientFilterDto } from '../dto/client-filter.dto';

@Injectable()
export class ClientsRepository {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(data: CreateClientDto) {
    return this.prisma.client.create({
      data,
    });
  }

  async findById(id: string) {
    return this.prisma.client.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });
  }

  async findByDocument(
    companyId: string,
    document: string,
  ) {
    return this.prisma.client.findFirst({
      where: {
        companyId,
        document,
        deletedAt: null,
      },
    });
  }

  async findAll(filter: ClientFilterDto) {
    const where: Prisma.ClientWhereInput = {
      deletedAt: null,
    };

    if (filter.companyId) {
      where.companyId = filter.companyId;
    }

    if (filter.status) {
      where.status = filter.status;
    }

    if (filter.active !== undefined) {
      where.active = filter.active;
    }

    if (filter.search) {
      where.OR = [
        {
          name: {
            contains: filter.search,
            mode: 'insensitive',
          },
        },
        {
          document: {
            contains: filter.search,
            mode: 'insensitive',
          },
        },
        {
          email: {
            contains: filter.search,
            mode: 'insensitive',
          },
        },
        {
          contactName: {
            contains: filter.search,
            mode: 'insensitive',
          },
        },
      ];
    }

    const orderBy: Prisma.ClientOrderByWithRelationInput = {
      [filter.sortBy]: filter.sortOrder.toLowerCase() as Prisma.SortOrder,
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.client.findMany({
        where,
        orderBy,
        skip: filter.skip,
        take: filter.take,
      }),

      this.prisma.client.count({
        where,
      }),
    ]);

    return {
      data,
      total,
      page: filter.page,
      pageSize: filter.take,
      totalPages: Math.ceil(total / filter.take),
    };
  }

  async update(
    id: string,
    data: UpdateClientDto,
  ) {
    return this.prisma.client.update({
      where: {
        id,
      },
      data,
    });
  }

  async softDelete(id: string) {
    return this.prisma.client.update({
      where: {
        id,
      },
      data: {
        active: false,
        deletedAt: new Date(),
      },
    });
  }
}