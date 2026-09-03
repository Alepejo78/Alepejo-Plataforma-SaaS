import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { Permissions } from '../../identity/auth/decorators/permissions.decorator';
import { Module } from '../../identity/license/decorators/module.decorator';

import { SalesSettingsService } from '../services/sales-settings.service';

import { UpsertSalesSettingsDto } from '../dto/upsert-sales-settings.dto';

@ApiTags('Sales Settings')
@Controller('sales-settings')
@Module('SALES')
export class SalesSettingsController {
  constructor(private readonly service: SalesSettingsService) {}

  @Get()
  @Permissions('sales-settings.view')
  @ApiOperation({ summary: 'Minhas configurações de vendas' })
  getMine(@CurrentUser('companyId') companyId: string) {
    return this.service.getSettings(companyId);
  }

  @Put()
  @Permissions('sales-settings.manage')
  @ApiOperation({ summary: 'Alterar configurações de vendas' })
  updateMine(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: UpsertSalesSettingsDto,
  ) {
    return this.service.updateSettings(companyId, dto);
  }
}
