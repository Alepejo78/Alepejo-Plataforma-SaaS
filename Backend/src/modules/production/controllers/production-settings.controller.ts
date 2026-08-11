import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { Permissions } from '../../identity/auth/decorators/permissions.decorator';
import { Module } from '../../identity/license/decorators/module.decorator';

import { ProductionOrdersService } from '../services/production-orders.service';

import { UpsertProductionSettingsDto } from '../dto/upsert-production-settings.dto';

@ApiTags('Production Settings')
@Controller('production-settings')
@Module('PRODUCTION')
export class ProductionSettingsController {
  constructor(
    private readonly service: ProductionOrdersService,
  ) {}

  @Get()
  @Permissions('production-settings.view')
  @ApiOperation({ summary: 'Minhas configurações de produção' })
  getMine(@CurrentUser('companyId') companyId: string) {
    return this.service.getSettings(companyId);
  }

  @Put()
  @Permissions('production-settings.manage')
  @ApiOperation({ summary: 'Alterar configurações de produção' })
  updateMine(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: UpsertProductionSettingsDto,
  ) {
    return this.service.updateSettings(companyId, dto);
  }
}
