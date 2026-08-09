import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';

import { CboFilterDto } from '../dto/cbo-filter.dto';

@Injectable()
export class CboService {
  constructor(private readonly prisma: PrismaService) {}

  /** Catálogo global (CBO 2002) — sem companyId, só leitura. */
  async findAll(filter: CboFilterDto) {
    const { search, limit } = filter;

    const where: Prisma.CboOccupationWhereInput = search
      ? {
          OR: [
            { code: { contains: search, mode: 'insensitive' } },
            { title: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    return this.prisma.cboOccupation.findMany({
      where,
      take: limit,
      orderBy: { title: 'asc' },
    });
  }
}
