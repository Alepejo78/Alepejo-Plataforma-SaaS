import { Injectable } from '@nestjs/common';
import {
  Prisma,
  RolePermission,
} from '@prisma/client';

import { BaseRepository } from '../../../../core/common/repositories/base.repository';
import { PrismaService } from '../../../../core/prisma/prisma.service';

import { RolePermissionFilterDto } from '../dto/role-permission-filter.dto';

@Injectable()
export class RolePermissionsRepository extends BaseRepository {
  constructor(
    protected readonly prisma: PrismaService,
  ) {
    super(prisma);
  }

  async roleBelongsToCompany(
    companyId: string,
    roleId: string,
  ): Promise<boolean> {
    const role = await this.prisma.role.findFirst({
      where: {
        id: roleId,
        companyId,
      },
      select: {
        id: true,
      },
    });

    return !!role;
  }

  async create(
    data: Prisma.RolePermissionCreateInput,
  ): Promise<RolePermission> {
    return this.prisma.rolePermission.create({
      data,
      include: {
        role: true,
        permission: {
          include: {
            group: true,
          },
        },
      },
    });
  }

  async findAll(
    companyId: string,
    filter: RolePermissionFilterDto,
  ) {
    const page = Number(filter.page ?? 1);
    const limit = Number(filter.limit ?? 20);

    const where: Prisma.RolePermissionWhereInput = {
      role: {
        companyId,
      },
    };

    if (filter.roleId) {
      where.roleId = filter.roleId;
    }

    if (filter.permissionId) {
      where.permissionId = filter.permissionId;
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.rolePermission.findMany({
        where,
        include: {
          role: true,
          permission: {
            include: {
              group: true,
            },
          },
        },
        orderBy: {
          [filter.orderBy ?? 'createdAt']:
            filter.orderDirection ?? 'desc',
        },
        skip: this.getSkip(page, limit),
        take: limit,
      }),
      this.prisma.rolePermission.count({
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
    companyId: string,
    id: string,
  ): Promise<RolePermission | null> {
    return this.prisma.rolePermission.findFirst({
      where: {
        id,
        role: {
          companyId,
        },
      },
      include: {
        role: true,
        permission: {
          include: {
            group: true,
          },
        },
      },
    });
  }

  async findByRoleAndPermission(
    companyId: string,
    roleId: string,
    permissionId: string,
  ): Promise<RolePermission | null> {
    return this.prisma.rolePermission.findFirst({
      where: {
        roleId,
        permissionId,
        role: {
          companyId,
        },
      },
    });
  }

  // A checagem de que o vínculo pertence a `companyId` (via role) é
  // feita no service (findById) ANTES de chamar update/delete.
  async update(
    id: string,
    data: Prisma.RolePermissionUpdateInput,
  ): Promise<RolePermission> {
    return this.prisma.rolePermission.update({
      where: {
        id,
      },
      data,
      include: {
        role: true,
        permission: {
          include: {
            group: true,
          },
        },
      },
    });
  }

  async delete(
    id: string,
  ): Promise<RolePermission> {
    return this.prisma.rolePermission.delete({
      where: {
        id,
      },
    });
  }
}
