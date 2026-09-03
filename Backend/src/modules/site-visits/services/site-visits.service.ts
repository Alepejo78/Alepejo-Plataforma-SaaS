import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../core/prisma/prisma.service';

@Injectable()
export class SiteVisitsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Soma 1 no contador da página e devolve o total atualizado. */
  async increment(page: string): Promise<number> {
    const counter = await this.prisma.siteVisitCounter.upsert({
      where: { page },
      update: { count: { increment: 1 } },
      create: { page, count: 1 },
    });

    return counter.count;
  }
}
