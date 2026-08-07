import { Injectable } from '@nestjs/common';
import {
  Prisma,
  UserRole,
} from '@prisma/client';

import { BaseRepository } from '../../../../core/common/repositories/base.repository';
import { PrismaService } from '../../../../core/prisma/prisma.service';

import { UserRoleFilterDto } from '../dto/user-role-filter.dto';

@Injectable()
export class UserRolesRepository extends BaseRepository {
  constructor(
    protected readonly prisma: PrismaService,
  ) {
    super(prisma);
  }

  async userBelongsToCompany(
    companyId: string,
    userId: string,
  ): Promise<boolean> {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        companyId,
      },
      select: {
        id: true,
      },
    });

    return !!user;
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
    data: Prisma.UserRoleCreateInput,
  ): Promise<UserRole> {
    return this.prisma.userRole.create({
      data,
      include: {
        user: true,
        role: true,
      },
    });
  }

  async findAll(
    companyId: string,
    filter: UserRoleFilterDto,
  ) {
    const page = Number(filter.page ?? 1);
    const limit = Number(filter.limit ?? 20);

    const where: Prisma.UserRoleWhereInput = {
      user: {
        companyId,
      },
    };

    if (filter.userId) {
      where.userId = filter.userId;
    }

    if (filter.roleId) {
      where.roleId = filter.roleId;
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.userRole.findMany({
        where,
        include: {
          user: true,
          role: true,
        },
        orderBy: {
          [filter.orderBy ?? 'createdAt']:
            filter.orderDirection ?? 'desc',
        },
        skip: this.getSkip(page, limit),
        take: limit,
      }),
      this.prisma.userRole.count({
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
  ): Promise<UserRole | null> {
    return this.prisma.userRole.findFirst({
      where: {
        id,
        user: {
          companyId,
        },
      },
      include: {
        user: true,
        role: true,
      },
    });
  }

  async findByUserAndRole(
    companyId: string,
    userId: string,
    roleId: string,
  ): Promise<UserRole | null> {
    return this.prisma.userRole.findFirst({
      where: {
        userId,
        roleId,
        user: {
          companyId,
        },
      },
    });
  }

  // A checagem de que o vínculo pertence a `companyId` é feita no
  // service (findById) ANTES de chamar delete.
  async delete(
    id: string,
  ): Promise<UserRole> {
    return this.prisma.userRole.delete({
      where: {
        id,
      },
    });
  }
}
