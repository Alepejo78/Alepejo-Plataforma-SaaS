import { Controller, Delete, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { Permissions } from '../../identity/auth/decorators/permissions.decorator';
import { Module } from '../../identity/license/decorators/module.decorator';

import { TimeClockApiKeyService } from '../services/time-clock-api-key.service';

@ApiTags('Time Clock API Key')
@Controller('time-clock/api-key')
@Module('LABOR')
export class TimeClockApiKeyController {
  constructor(
    private readonly service: TimeClockApiKeyService,
  ) {}

  @Get()
  @Permissions('time-clock.manage-api-key')
  @ApiOperation({
    summary: 'Status da chave de API (nunca devolve o valor puro)',
  })
  getStatus(@CurrentUser('companyId') companyId: string) {
    return this.service.getStatus(companyId);
  }

  @Post()
  @Permissions('time-clock.manage-api-key')
  @ApiOperation({
    summary: 'Gerar (ou regenerar) a chave de API — valor puro só aparece aqui, uma vez',
  })
  generate(@CurrentUser('companyId') companyId: string) {
    return this.service.generate(companyId);
  }

  @Delete()
  @Permissions('time-clock.manage-api-key')
  @ApiOperation({ summary: 'Revogar a chave de API' })
  revoke(@CurrentUser('companyId') companyId: string) {
    return this.service.revoke(companyId);
  }
}
