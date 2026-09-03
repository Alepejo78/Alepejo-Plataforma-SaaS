import { BadRequestException, Controller, Param, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { Public } from '../../../core/decorators/public.decorator';
import { getClientIp } from '../../../core/utils/client-ip.util';

import { SiteVisitsService } from '../services/site-visits.service';

/** Páginas públicas com contador — lista fechada, evita criar linha pra qualquer string que chegar na rota. */
const TRACKED_PAGES = ['institucional'];

@ApiTags('Site Visits')
@Controller('site-visits')
export class SiteVisitsController {
  constructor(private readonly service: SiteVisitsService) {}

  @Public()
  @Post(':page/increment')
  @ApiOperation({ summary: 'Soma uma visita na página pública (contador do rodapé), 1 por IP por dia' })
  async increment(@Param('page') page: string, @Req() req: Request) {
    if (!TRACKED_PAGES.includes(page)) {
      throw new BadRequestException('Página sem contador de visitas.');
    }

    const count = await this.service.increment(page, getClientIp(req));

    return { count };
  }
}
