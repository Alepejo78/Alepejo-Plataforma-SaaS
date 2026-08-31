import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';

import { CboFilterDto } from '../dto/cbo-filter.dto';
import { CreateCboDto } from '../dto/create-cbo.dto';
import { UpdateCboDto } from '../dto/update-cbo.dto';

@Injectable()
export class CboService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Catálogo global (CBO 2002) — sem companyId. O dataset importado do
   * Ministério do Trabalho não é completo (ver
   * `create`/`update`/`remove`, restritos ao dono da plataforma via
   * `platform.cbo.manage`) — esta listagem paginada é usada tanto pela
   * tela de gestão quanto, sem `page`, pelo autocomplete de Função.
   */
  async findAll(filter: CboFilterDto) {
    const { search, page, limit } = filter;

    const where: Prisma.CboOccupationWhereInput = search
      ? {
          OR: [
            { code: { contains: search, mode: 'insensitive' } },
            { title: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [data, total] = await this.prisma.$transaction([
      this.prisma.cboOccupation.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { title: 'asc' },
      }),

      this.prisma.cboOccupation.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  async create(dto: CreateCboDto) {
    const existing = await this.prisma.cboOccupation.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new ConflictException(
        `Já existe um CBO cadastrado com o código ${dto.code} (${existing.title}).`,
      );
    }

    return this.prisma.cboOccupation.create({ data: dto });
  }

  async update(code: string, dto: UpdateCboDto) {
    const existing = await this.prisma.cboOccupation.findUnique({
      where: { code },
    });

    if (!existing) {
      throw new NotFoundException('Código CBO não encontrado.');
    }

    return this.prisma.cboOccupation.update({
      where: { code },
      data: { title: dto.title },
    });
  }

  async remove(code: string) {
    const existing = await this.prisma.cboOccupation.findUnique({
      where: { code },
    });

    if (!existing) {
      throw new NotFoundException('Código CBO não encontrado.');
    }

    await this.prisma.cboOccupation.delete({ where: { code } });

    return { success: true };
  }
}
