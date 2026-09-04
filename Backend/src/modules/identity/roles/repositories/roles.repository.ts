import { Injectable } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';

import { BaseRepository } from '../../../../core/common/repositories/base.repository';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { RoleFilterDto } from '../dto/role-filter.dto';

@Injectable()
export class RolesRepository extends BaseRepository {
  constructor(
    protected readonly prisma: PrismaService,
  ) {
    super(prisma);
  }

  async create(data: Prisma.RoleCreateInput): Promise<Role> {
    return this.prisma.role.create({
      data,
    });
  }

  async findAll(
    filter: RoleFilterDto,
    companyId: string,
  ) {
    const page = Number(filter.page ?? 1);
    const limit = Number(filter.limit ?? 20);
    const skip = this.getSkip(page, limit);

    const where: Prisma.RoleWhereInput = {
      companyId,
      deletedAt: null,
    };

    if (filter.search?.trim()) {
      where.OR = [
        {
          name: {
            contains: filter.search,
            mode: 'insensitive',
          },
        },
        {
          code: {
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

    if (filter.active !== undefined) {
      where.active = filter.active;
    }

    const orderBy: Prisma.RoleOrderByWithRelationInput = {
      [filter.orderBy ?? 'name']:
        filter.orderDirection ?? 'asc',
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.role.findMany({
        where,
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),

      this.prisma.role.count({
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
    companyId: string,
  ): Promise<Role | null> {
    return this.prisma.role.findFirst({
      where: {
        id,
        companyId,
        deletedAt: null,
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }

  async findByCode(
    companyId: string,
    code: string,
  ): Promise<Role | null> {
    return this.prisma.role.findFirst({
      where: {
        companyId,
        code,
        deletedAt: null,
      },
    });
  }

  async findByName(
    companyId: string,
    name: string,
  ): Promise<Role | null> {
    return this.prisma.role.findFirst({
      where: {
        companyId,
        name,
        deletedAt: null,
      },
    });
  }

  /** Role excluída (soft delete) com este código OU nome, se houver — os dois continuam ocupados pra sempre no banco (@@unique não olha deletedAt). */
  async findDeletedByCodeOrName(
    companyId: string,
    code: string,
    name: string,
  ): Promise<Role | null> {
    return this.prisma.role.findFirst({
      where: {
        companyId,
        deletedAt: { not: null },
        OR: [{ code }, { name }],
      },
    });
  }

  async restore(
    id: string,
    data: Prisma.RoleUpdateInput,
  ): Promise<Role> {
    return this.prisma.role.update({
      where: { id },
      data: {
        ...data,
        active: true,
        deletedAt: null,
      },
    });
  }

  async update(
    id: string,
    data: Prisma.RoleUpdateInput,
  ): Promise<Role> {
    return this.prisma.role.update({
      where: {
        id,
      },
      data,
    });
  }

  async softDelete(id: string): Promise<Role> {
    return this.prisma.role.update({
      where: {
        id,
      },
      data: {
        deletedAt: new Date(),
      },
    });
  }
}