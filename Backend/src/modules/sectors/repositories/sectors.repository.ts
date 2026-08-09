import { Injectable } from '@nestjs/common';
import { Prisma, Sector } from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';

import { CreateSectorDto } from '../dto/create-sector.dto';
import { UpdateSectorDto } from '../dto/update-sector.dto';
import { SectorFilterDto } from '../dto/sector-filter.dto';

@Injectable()
export class SectorsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    companyId: string,
    data: CreateSectorDto,
  ): Promise<Sector> {
    return this.prisma.sector.create({
      data: {
        ...data,
        companyId,
      },
    });
  }

  async findById(
    companyId: string,
    id: string,
  ): Promise<Sector | null> {
    return this.prisma.sector.findFirst({
      where: { id, companyId },
    });
  }

  async findByName(
    companyId: string,
    name: string,
  ): Promise<Sector | null> {
    return this.prisma.sector.findFirst({
      where: { companyId, name },
    });
  }

  async findAll(companyId: string, filter: SectorFilterDto) {
    const { search, page, limit, orderBy, order } = filter;

    const where: Prisma.SectorWhereInput = {
      companyId,
      active: true,

      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          {
            description: {
              contains: search,
              mode: 'insensitive',
            },
          },
        ],
      }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.sector.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [orderBy]: order },
      }),

      this.prisma.sector.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  // Observação: Prisma só aceita campos únicos em `where` de update().
  // A checagem de que `id` pertence a `companyId` é feita no service
  // (via findById) ANTES de chamar estes métodos.
  async update(
    id: string,
    data: UpdateSectorDto,
  ): Promise<Sector> {
    return this.prisma.sector.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<Sector> {
    return this.prisma.sector.update({
      where: { id },
      data: { active: false },
    });
  }

  /** Quantas funções usam este setor. */
  async countJobFunctions(sectorId: string): Promise<number> {
    return this.prisma.jobFunction.count({
      where: { sectorId },
    });
  }

  /**
   * Reativa um setor excluído (soft delete) com o mesmo nome, em vez de
   * criar uma linha nova (o índice único de companyId+name não exclui
   * setores inativos, então um create() colidiria).
   */
  async restore(
    id: string,
    data: CreateSectorDto,
  ): Promise<Sector> {
    return this.prisma.sector.update({
      where: { id },
      data: {
        ...data,
        active: true,
      },
    });
  }
}
