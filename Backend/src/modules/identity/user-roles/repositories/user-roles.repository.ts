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
    filter: UserRoleFilterDto,
  ) {
    const page = Number(filter.page ?? 1);
    const limit = Number(filter.limit ?? 20);

    const where: Prisma.UserRoleWhereInput = {};

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
    id: string,
  ): Promise<UserRole | null> {
    return this.prisma.userRole.findUnique({
      where: {
        id,
      },
      include: {
        user: true,
        role: true,
      },
    });
  }

  async findByUserAndRole(
    userId: string,
    roleId: string,
  ): Promise<UserRole | null> {
    return this.prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId,
          roleId,
        },
      },
    });
  }

  async update(
    id: string,
    data: Prisma.UserRoleUpdateInput,
  ): Promise<UserRole> {
    return this.prisma.userRole.update({
      where: {
        id,
      },
      data,
      include: {
        user: true,
        role: true,
      },
    });
  }

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