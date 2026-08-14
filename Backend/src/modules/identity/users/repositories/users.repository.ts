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

  async findAll(companyId: string) {
    return this.prisma.user.findMany({
      where: {
        companyId,
        deletedAt: null,
      },
      include: {
        company: true,
        roles: {
          include: {
            role: true,
          },
        },
        companies: {
          select: {
            companyId: true,
          },
        },
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

        companies: {
          select: {
            companyId: true,
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

  // Sem escopo de companyId de propósito: usado pelo consumo público
  // do token de redefinição de senha, antes de o usuário estar logado.
  async findByIdUnscoped(id: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });
  }

  // Troca o(s) vínculo(s) de perfil do usuário — a UI usa seleção
  // única, então substitui em vez de acumular.
  async syncRole(userId: string, roleId?: string): Promise<void> {
    await this.prisma.userRole.deleteMany({
      where: {
        userId,
      },
    });

    if (roleId) {
      await this.prisma.userRole.create({
        data: {
          userId,
          roleId,
        },
      });
    }
  }

  // Garante o vínculo de login cruzado (UserCompany) sem duplicar se já
  // existir — idempotente de propósito, ver AuthService.switchCompany.
  async linkCompany(userId: string, companyId: string): Promise<void> {
    await this.prisma.userCompany.upsert({
      where: {
        userId_companyId: { userId, companyId },
      },
      create: { userId, companyId },
      update: {},
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
