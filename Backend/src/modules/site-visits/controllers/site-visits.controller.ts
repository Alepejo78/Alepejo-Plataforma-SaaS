import { BadRequestException, Controller, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../../../core/decorators/public.decorator';

import { SiteVisitsService } from '../services/site-visits.service';

/** Páginas públicas com contador — lista fechada, evita criar linha pra qualquer string que chegar na rota. */
const TRACKED_PAGES = ['institucional'];

@ApiTags('Site Visits')
@Controller('site-visits')
export class SiteVisitsController {
  constructor(private readonly service: SiteVisitsService) {}

  @Public()
  @Post(':page/increment')
  @ApiOperation({ summary: 'Soma uma visita na página pública (contador do rodapé)' })
  async increment(@Param('page') page: string) {
    if (!TRACKED_PAGES.includes(page)) {
      throw new BadRequestException('Página sem contador de visitas.');
    }

    const count = await this.service.increment(page);

    return { count };
  }
}
