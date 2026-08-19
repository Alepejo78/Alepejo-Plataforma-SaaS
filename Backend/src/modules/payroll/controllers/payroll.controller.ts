import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { Permissions } from '../../identity/auth/decorators/permissions.decorator';
import { Module } from '../../identity/license/decorators/module.decorator';

import { PayrollService } from '../services/payroll.service';
import { PayrollReportService } from '../services/payroll-report.service';

import { GeneratePayrollDto } from '../dto/generate-payroll.dto';
import { AdjustPayrollItemDto } from '../dto/adjust-payroll-item.dto';
import { PayrollFilterDto } from '../dto/payroll-filter.dto';

@ApiTags('Payroll')
@Controller('payroll')
@Module('LABOR')
export class PayrollController {
  constructor(
    private readonly service: PayrollService,
    private readonly reportService: PayrollReportService,
  ) {}

  /**
   * Precisa vir antes de `GET /:id` — senão o Nest casa "reports" com
   * o parâmetro `:id`, já que rotas são resolvidas na ordem em que são
   * declaradas.
   */
  @Get('reports/monthly-charges')
  @Permissions('payroll.report')
  @ApiOperation({
    summary: 'Relatório consolidado de encargos (INSS/IRRF/FGTS/VT) — Folha + 13º + Férias',
  })
  getMonthlyCharges(
    @CurrentUser('companyId') companyId: string,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return this.reportService.getMonthlyCharges(companyId, Number(year), Number(month));
  }

  @Post('generate')
  @Permissions('payroll.generate')
  @ApiOperation({ summary: 'Gerar folha de pagamento de uma competência' })
  generate(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('rootCompanyId') rootCompanyId: string,
    @Body() dto: GeneratePayrollDto,
  ) {
    return this.service.generate(companyId, rootCompanyId, dto);
  }

  @Get()
  @Permissions('payroll.view')
  @ApiOperation({ summary: 'Listar folhas de pagamento' })
  findAll(
    @CurrentUser('companyId') companyId: string,
    @Query() filter: PayrollFilterDto,
  ) {
    return this.service.findAll(companyId, filter);
  }

  @Get(':id')
  @Permissions('payroll.view')
  @ApiOperation({ summary: 'Detalhar folha de pagamento' })
  findOne(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.findOne(companyId, id);
  }

  @Get(':id/items/:itemId')
  @Permissions('payroll.view')
  @ApiOperation({ summary: 'Detalhar item da folha (holerite)' })
  findItem(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    return this.service.findItem(companyId, id, itemId);
  }

  @Patch(':id/items/:itemId/recalculate')
  @Permissions('payroll.update')
  @ApiOperation({ summary: 'Recalcular item a partir do ponto/faltas atuais' })
  recalculateItem(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('rootCompanyId') rootCompanyId: string,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    return this.service.recalculateItem(companyId, rootCompanyId, id, itemId);
  }

  @Patch(':id/items/:itemId')
  @Permissions('payroll.update')
  @ApiOperation({ summary: 'Ajustar proventos/descontos manuais de um item' })
  adjustItem(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('rootCompanyId') rootCompanyId: string,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: AdjustPayrollItemDto,
  ) {
    return this.service.adjustItem(companyId, rootCompanyId, id, itemId, dto);
  }

  @Patch(':id/items/:itemId/exclude')
  @Permissions('payroll.update')
  @ApiOperation({ summary: 'Excluir um colaborador desta folha' })
  excludeItem(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    return this.service.excludeItem(companyId, id, itemId);
  }

  @Patch(':id/items/:itemId/include')
  @Permissions('payroll.update')
  @ApiOperation({ summary: 'Reincluir um colaborador nesta folha' })
  includeItem(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    return this.service.includeItem(companyId, id, itemId);
  }

  @Patch(':id/approve')
  @Permissions('payroll.approve')
  @ApiOperation({
    summary: 'Aprovar folha (gera os títulos a pagar de cada colaborador)',
  })
  approve(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.service.approve(companyId, id, userId);
  }

  @Patch(':id/reverse')
  @Permissions('payroll.approve')
  @ApiOperation({
    summary: 'Estornar aprovação (volta a rascunho, apaga os títulos gerados)',
  })
  reverse(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.reverse(companyId, id);
  }

  @Patch(':id/cancel')
  @Permissions('payroll.cancel')
  @ApiOperation({ summary: 'Cancelar folha' })
  cancel(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.cancel(companyId, id);
  }
}
