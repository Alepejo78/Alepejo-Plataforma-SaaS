import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../core/prisma/prisma.service';

/** "AAAA-MM-DD" no fuso America/Sao_Paulo — chave de dedupe do dia. */
function todayKey(): string {
  return new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Sao_Paulo',
  });
}

@Injectable()
export class SiteVisitsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Soma 1 no contador da página — só na primeira visita do dia pra
   * esse IP; atualizar a página (ou voltar depois) no mesmo dia não
   * conta de novo. Sempre devolve o total atualizado.
   */
  async increment(page: string, ip: string): Promise<number> {
    const day = todayKey();

    const alreadyVisitedToday = await this.prisma.siteVisitLog.findUnique({
      where: { page_ip_day: { page, ip, day } },
    });

    if (alreadyVisitedToday) {
      const counter = await this.prisma.siteVisitCounter.findUnique({
        where: { page },
      });

      return counter?.count ?? 0;
    }

    await this.prisma.siteVisitLog.create({ data: { page, ip, day } });

    const counter = await this.prisma.siteVisitCounter.upsert({
      where: { page },
      update: { count: { increment: 1 } },
      create: { page, count: 1 },
    });

    return counter.count;
  }
}
