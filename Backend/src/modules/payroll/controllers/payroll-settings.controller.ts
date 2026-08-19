import { Body, Controller, Get, Patch } from '@nestjs/common';

import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { Permissions } from '../../identity/auth/decorators/permissions.decorator';
import { Module } from '../../identity/license/decorators/module.decorator';

import { PayrollSettingsService } from '../services/payroll-settings.service';

import { UpdatePayrollSettingsDto } from '../dto/update-payroll-settings.dto';

/** Cadastro de grupo ("Interprise") — companyId aqui é sempre a raiz do grupo (rootCompanyId), ver WarehouseController. */
@ApiTags('Payroll — Configurações')
@Controller('payroll/settings')
@Module('LABOR')
export class PayrollSettingsController {
  constructor(private readonly service: PayrollSettingsService) {}

  @Get()
  @Permissions('payroll-settings.view')
  @ApiOperation({ summary: 'Configurações da folha' })
  find(@CurrentUser('rootCompanyId') companyId: string) {
    return this.service.find(companyId);
  }

  @Patch()
  @Permissions('payroll-settings.manage')
  @ApiOperation({ summary: 'Alterar configurações da folha' })
  update(
    @CurrentUser('rootCompanyId') companyId: string,
    @Body() dto: UpdatePayrollSettingsDto,
  ) {
    return this.service.update(companyId, dto);
  }
}
