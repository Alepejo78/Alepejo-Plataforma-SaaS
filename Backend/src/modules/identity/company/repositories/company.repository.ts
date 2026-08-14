import { Injectable } from '@nestjs/common';
import { Company, Prisma } from '@prisma/client';

import { BaseRepository } from '../../../../core/common/repositories/base.repository';
import { PrismaService } from '../../../../core/prisma/prisma.service';

@Injectable()
export class CompanyRepository extends BaseRepository {
  constructor(
    protected readonly prisma: PrismaService,
  ) {
    super(prisma);
  }

  async create(data: Prisma.CompanyCreateInput): Promise<Company> {
    return this.prisma.company.create({
      data,
    });
  }

  async findAll(page = 1, limit = 20) {
    const skip = this.getSkip(page, limit);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.company.findMany({
        where: {
          deletedAt: null,
        },
        orderBy: {
          legalName: 'asc',
        },
        skip,
        take: limit,
      }),

      this.prisma.company.count({
        where: {
          deletedAt: null,
        },
      }),
    ]);

    return {
      items,
      pagination: this.buildPagination(page, limit, total),
    };
  }

  async findById(id: string): Promise<Company | null> {
    return this.prisma.company.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });
  }

  async findByDocument(
    document: string,
  ): Promise<Company | null> {
    return this.prisma.company.findFirst({
      where: {
        document,
        deletedAt: null,
      },
    });
  }

  /** Raiz + todas as filiais (mesmo `rootCompanyId`) — usado pela tela "Empresas do grupo". */
  async findGroup(rootCompanyId: string): Promise<Company[]> {
    return this.prisma.company.findMany({
      where: {
        deletedAt: null,
        OR: [
          { id: rootCompanyId },
          { rootCompanyId },
        ],
      },
      orderBy: {
        legalName: 'asc',
      },
    });
  }

  /** Empresas que este login pode acessar (login cruzado) — ver UserCompany. */
  async findLinkedToUser(userId: string): Promise<Company[]> {
    const links = await this.prisma.userCompany.findMany({
      where: {
        userId,
        company: { deletedAt: null },
      },
      include: {
        company: true,
      },
      orderBy: {
        company: { legalName: 'asc' },
      },
    });

    return links.map((link) => link.company);
  }

  async update(
    id: string,
    data: Prisma.CompanyUpdateInput,
  ): Promise<Company> {
    return this.prisma.company.update({
      where: {
        id,
      },
      data,
    });
  }

  async softDelete(id: string): Promise<Company> {
    return this.prisma.company.update({
      where: {
        id,
      },
      data: {
        deletedAt: new Date(),
      },
    });
  }
}