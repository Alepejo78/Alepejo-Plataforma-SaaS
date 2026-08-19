import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';

import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { Permissions } from '../../identity/auth/decorators/permissions.decorator';
import { Module } from '../../identity/license/decorators/module.decorator';

import { PayrollTaxTableService } from '../services/payroll-tax-table.service';

import { CreatePayrollTaxTableDto } from '../dto/create-payroll-tax-table.dto';

/**
 * Cadastro de grupo ("Interprise") — companyId aqui é sempre a raiz
 * do grupo (rootCompanyId), ver WarehouseController. Parâmetros
 * fiscais (INSS/IRRF/FGTS) são os mesmos pra todas as empresas do
 * mesmo grupo econômico, não fazem sentido duplicados por filial.
 */
@ApiTags('Payroll — Parâmetros fiscais')
@Controller('payroll/tax-tables')
@Module('LABOR')
export class PayrollTaxTableController {
  constructor(private readonly service: PayrollTaxTableService) {}

  @Post()
  @Permissions('payroll-tax-table.manage')
  @ApiOperation({
    summary:
      'Cadastrar nova vigência de INSS/IRRF/FGTS (encerra a vigência anterior sozinho)',
  })
  create(
    @CurrentUser('rootCompanyId') companyId: string,
    @Body() dto: CreatePayrollTaxTableDto,
  ) {
    return this.service.create(companyId, dto);
  }

  @Get()
  @Permissions('payroll-tax-table.view')
  @ApiOperation({ summary: 'Listar vigências cadastradas' })
  findAll(@CurrentUser('rootCompanyId') companyId: string) {
    return this.service.findAll(companyId);
  }

  @Get('active')
  @Permissions('payroll-tax-table.view')
  @ApiOperation({ summary: 'Tabela vigente hoje (ou numa data informada)' })
  findActive(
    @CurrentUser('rootCompanyId') companyId: string,
    @Query('date') date?: string,
  ) {
    return this.service.findActive(companyId, date);
  }

  @Get(':id')
  @Permissions('payroll-tax-table.view')
  @ApiOperation({ summary: 'Buscar uma vigência específica' })
  findOne(
    @CurrentUser('rootCompanyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.findOne(companyId, id);
  }
}
