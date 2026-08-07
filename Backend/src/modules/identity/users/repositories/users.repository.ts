import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { Prisma, User } from '@prisma/client';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({
      data,
    });
  }

  async findAll(companyId: string): Promise<User[]> {
    return this.prisma.user.findMany({
      where: {
        companyId,
        deletedAt: null,
      },
      include: {
        company: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findById(companyId: string, id: string) {
    return this.prisma.user.findFirst({
      where: {
        id,
        companyId,
        deletedAt: null,
      },
      include: {
        company: true,

        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: {
                      include: {
                        group: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  // Usado apenas pelo fluxo de login: e-mail é único globalmente no
  // sistema (@unique no schema), então essa busca não é escopada por
  // companyId de propósito.
  async findByEmail(email: string) {
    return this.prisma.user.findFirst({
      where: {
        email,
        deletedAt: null,
      },
      include: {
        company: true,

        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: {
                      include: {
                        group: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({
      where: {
        id,
      },
      data,
    });
  }

  async softDelete(id: string): Promise<User> {
    return this.prisma.user.update({
      where: {
        id,
      },
      data: {
        deletedAt: new Date(),
        active: false,
      },
    });
  }
}
