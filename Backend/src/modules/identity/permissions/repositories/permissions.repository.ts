import { Injectable } from '@nestjs/common';
import { Permission, Prisma } from '@prisma/client';

import { BaseRepository } from '../../../../core/common/repositories/base.repository';
import { PrismaService } from '../../../../core/prisma/prisma.service';

import { PermissionFilterDto } from '../dto/permission-filter.dto';

@Injectable()
export class PermissionsRepository extends BaseRepository {
  constructor(
    protected readonly prisma: PrismaService,
  ) {
    super(prisma);
  }

  async create(
    data: Prisma.PermissionCreateInput,
  ): Promise<Permission> {
    return this.prisma.permission.create({
      data,
    });
  }

  async findAll(
    filter: PermissionFilterDto,
  ) {
    const page = Number(filter.page ?? 1);
    const limit = Number(filter.limit ?? 20);

    const where: Prisma.PermissionWhereInput = {};

    if (filter.search?.trim()) {
      where.OR = [
        {
          code: {
            contains: filter.search,
            mode: 'insensitive',
          },
        },
        {
          name: {
            contains: filter.search,
            mode: 'insensitive',
          },
        },
        {
          description: {
            contains: filter.search,
            mode: 'insensitive',
          },
        },
      ];
    }

    if (filter.groupId) {
      where.groupId = filter.groupId;
    }

    if (filter.active !== undefined) {
      where.active = filter.active;
    }

    const orderBy: Prisma.PermissionOrderByWithRelationInput = {
      [filter.orderBy ?? 'name']:
        filter.orderDirection ?? 'asc',
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.permission.findMany({
        where,
        include: {
          group: true,
        },
        orderBy,
        skip: this.getSkip(page, limit),
        take: limit,
      }),
      this.prisma.permission.count({
        where,
      }),
    ]);

    return {
      items,
      pagination: this.buildPagination(
        page,
        limit,
        total,
      ),
    };
  }

  async findById(
    id: string,
  ): Promise<Permission | null> {
    return this.prisma.permission.findUnique({
      where: {
        id,
      },
      include: {
        group: true,
      },
    });
  }

  async findByCode(
    code: string,
  ): Promise<Permission | null> {
    return this.prisma.permission.findUnique({
      where: {
        code,
      },
    });
  }

  async update(
    id: string,
    data: Prisma.PermissionUpdateInput,
  ): Promise<Permission> {
    return this.prisma.permission.update({
      where: {
        id,
      },
      data,
    });
  }

  async delete(
    id: string,
  ): Promise<Permission> {
    return this.prisma.permission.delete({
      where: {
        id,
      },
    });
  }
}