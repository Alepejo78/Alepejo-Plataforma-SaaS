import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../../../core/decorators/public.decorator';

import { EntryChargeService } from '../services/entry-charge.service';

@ApiTags('Entry Charges')
@Controller('entry-charges/public')
export class EntryChargePublicController {
  constructor(private readonly service: EntryChargeService) {}

  /** Página pública de pagamento via chave PIX própria — link mandado por e-mail/WhatsApp. */
  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Dados de pagamento PIX para o cliente (link público)' })
  getPublicInfo(@Param('id') id: string, @Query('token') token: string) {
    return this.service.getPublicInfo(id, token);
  }
}
