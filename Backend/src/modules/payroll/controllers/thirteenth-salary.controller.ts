import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { Public } from '../../../core/decorators/public.decorator';
import { Permissions } from '../../identity/auth/decorators/permissions.decorator';
import { Module } from '../../identity/license/decorators/module.decorator';

import { ThirteenthSalaryService } from '../services/thirteenth-salary.service';
import { ThirteenthConfirmationService } from '../services/thirteenth-confirmation.service';
import { EmployeesService } from '../../employees/services/employees.service';

import { GenerateThirteenthSalaryDto } from '../dto/generate-thirteenth-salary.dto';
import { AdjustPayrollItemDto } from '../dto/adjust-payroll-item.dto';

@ApiTags('ThirteenthSalary')
@Controller('thirteenth-salary')
@Module('LABOR')
export class ThirteenthSalaryController {
  constructor(
    private readonly service: ThirteenthSalaryService,
    private readonly confirmationService: ThirteenthConfirmationService,
    private readonly employeesService: EmployeesService,
  ) {}

  /**
   * Autoatendimento — sem permissão nenhuma (mesmo padrão de
   * `EmployeesController.findMine`). Precisam vir antes de `:id` pelo
   * mesmo motivo das rotas públicas abaixo.
   */
  @Get('me/items')
  @ApiOperation({ summary: 'Meu histórico de recibos de 13º (autoatendimento)' })
  async findMineItems(@CurrentUser('companyId') companyId: string, @CurrentUser('id') userId: string) {
    const employee = await this.employeesService.findMine(companyId, userId);
    return this.service.findMineItems(companyId, employee.id);
  }

  @Post('me/:id/items/:itemId/confirm')
  @ApiOperation({ summary: 'Confirmar recebimento do meu recibo de 13º (autoatendimento)' })
  async confirmMine(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Param('itemId') itemId: string,
  ) {
    const employee = await this.employeesService.findMine(companyId, userId);
    return this.confirmationService.confirmMine(companyId, employee.id, itemId, userId);
  }

  /**
   * Rotas públicas (sem login) — precisam vir ANTES de `:id`, senão o
   * Nest casa "public" com o parâmetro (rotas resolvidas na ordem em
   * que são declaradas).
   */
  @Public()
  @Get('public/:id/:itemId')
  getPublicInfo(
    @Param('id') thirteenthSalaryId: string,
    @Param('itemId') itemId: string,
    @Query('token') token: string,
  ) {
    return this.confirmationService.getPublicInfo(thirteenthSalaryId, itemId, token);
  }

  @Public()
  @Post('public/:id/:itemId/confirm')
  confirmPublic(
    @Param('id') thirteenthSalaryId: string,
    @Param('itemId') itemId: string,
    @Query('token') token: string,
  ) {
    return this.confirmationService.confirmPublic(thirteenthSalaryId, itemId, token);
  }

  @Post('generate')
  @Permissions('thirteenth-salary.generate')
  @ApiOperation({ summary: 'Gerar parcela de 13º salário' })
  generate(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('rootCompanyId') rootCompanyId: string,
    @Body() dto: GenerateThirteenthSalaryDto,
  ) {
    return this.service.generate(companyId, rootCompanyId, dto);
  }

  @Get()
  @Permissions('thirteenth-salary.view')
  @ApiOperation({ summary: 'Listar 13º salário' })
  findAll(
    @CurrentUser('companyId') companyId: string,
    @Query('year') year?: string,
    @Query('installment') installment?: string,
  ) {
    return this.service.findAll(companyId, {
      year: year ? Number(year) : undefined,
      installment: installment ? Number(installment) : undefined,
    });
  }

  @Get(':id')
  @Permissions('thirteenth-salary.view')
  @ApiOperation({ summary: 'Detalhar 13º salário' })
  findOne(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.findOne(companyId, id);
  }

  @Get(':id/items/:itemId')
  @Permissions('thirteenth-salary.view')
  @ApiOperation({ summary: 'Detalhar item do 13º (recibo)' })
  findItem(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    return this.service.findItem(companyId, id, itemId);
  }

  @Patch(':id/items/:itemId')
  @Permissions('thirteenth-salary.update')
  @ApiOperation({ summary: 'Ajustar proventos/descontos manuais de um item' })
  adjustItem(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: AdjustPayrollItemDto,
  ) {
    return this.service.adjustItem(companyId, id, itemId, dto);
  }

  @Patch(':id/items/:itemId/exclude')
  @Permissions('thirteenth-salary.update')
  @ApiOperation({ summary: 'Excluir um colaborador deste 13º' })
  excludeItem(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    return this.service.excludeItem(companyId, id, itemId);
  }

  @Patch(':id/items/:itemId/include')
  @Permissions('thirteenth-salary.update')
  @ApiOperation({ summary: 'Reincluir um colaborador neste 13º' })
  includeItem(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    return this.service.includeItem(companyId, id, itemId);
  }

  @Patch(':id/approve')
  @Permissions('thirteenth-salary.approve')
  @ApiOperation({ summary: 'Aprovar 13º (gera os títulos a pagar)' })
  approve(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('rootCompanyId') rootCompanyId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.service.approve(companyId, rootCompanyId, id, userId);
  }

  @Patch(':id/reverse')
  @Permissions('thirteenth-salary.approve')
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
  @Permissions('thirteenth-salary.cancel')
  @ApiOperation({ summary: 'Cancelar 13º' })
  cancel(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.cancel(companyId, id);
  }

  @Delete(':id')
  @Permissions('thirteenth-salary.delete')
  @ApiOperation({ summary: 'Excluir 13º cancelado' })
  remove(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.remove(companyId, id);
  }

  @Patch(':id/items/:itemId/confirm')
  @Permissions('thirteenth-salary.confirm-item')
  @ApiOperation({ summary: 'Confirmar recebimento do recibo manualmente' })
  confirmItem(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    return this.confirmationService.confirm(companyId, id, itemId, userId);
  }

  @Post(':id/items/:itemId/send-confirmation')
  @Permissions('thirteenth-salary.confirm-item')
  @ApiOperation({ summary: 'Enviar link de confirmação do recibo por e-mail/WhatsApp' })
  sendConfirmation(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    return this.confirmationService.sendConfirmation(companyId, id, itemId);
  }
}
