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
import { PayrollStatus } from '@prisma/client';

import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { Public } from '../../../core/decorators/public.decorator';
import { Permissions } from '../../identity/auth/decorators/permissions.decorator';
import { Module } from '../../identity/license/decorators/module.decorator';

import { SalaryAdvanceService } from '../services/salary-advance.service';
import { SalaryAdvanceConfirmationService } from '../services/salary-advance-confirmation.service';

import { CreateSalaryAdvanceDto } from '../dto/create-salary-advance.dto';

@ApiTags('SalaryAdvance')
@Controller('salary-advances')
@Module('LABOR')
export class SalaryAdvanceController {
  constructor(
    private readonly service: SalaryAdvanceService,
    private readonly confirmationService: SalaryAdvanceConfirmationService,
  ) {}

  /** Rotas públicas (sem login) — precisam vir antes de `:id`. */
  @Public()
  @Get('public/:id')
  getPublicInfo(@Param('id') id: string, @Query('token') token: string) {
    return this.confirmationService.getPublicInfo(id, token);
  }

  @Public()
  @Post('public/:id/confirm')
  confirmPublic(@Param('id') id: string, @Query('token') token: string) {
    return this.confirmationService.confirmPublic(id, token);
  }

  @Post()
  @Permissions('salary-advance.create')
  @ApiOperation({ summary: 'Registrar adiantamento salarial' })
  create(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: CreateSalaryAdvanceDto,
  ) {
    return this.service.create(companyId, dto);
  }

  @Get()
  @Permissions('salary-advance.view')
  @ApiOperation({ summary: 'Listar adiantamentos salariais' })
  findAll(
    @CurrentUser('companyId') companyId: string,
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: PayrollStatus,
  ) {
    return this.service.findAll(companyId, { employeeId, status });
  }

  @Get(':id')
  @Permissions('salary-advance.view')
  @ApiOperation({ summary: 'Detalhar adiantamento salarial' })
  findOne(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.findOne(companyId, id);
  }

  @Patch(':id/approve')
  @Permissions('salary-advance.approve')
  @ApiOperation({ summary: 'Aprovar (gera título a pagar)' })
  approve(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('rootCompanyId') rootCompanyId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.service.approve(companyId, rootCompanyId, id, userId);
  }

  @Patch(':id/reverse')
  @Permissions('salary-advance.approve')
  @ApiOperation({
    summary: 'Estornar aprovação (volta a aguardar aprovação, apaga o título gerado)',
  })
  reverse(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.reverse(companyId, id);
  }

  @Patch(':id/cancel')
  @Permissions('salary-advance.cancel')
  @ApiOperation({ summary: 'Cancelar adiantamento' })
  cancel(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.cancel(companyId, id);
  }

  @Patch(':id/confirm')
  @Permissions('salary-advance.confirm-item')
  @ApiOperation({ summary: 'Confirmar recebimento manualmente' })
  confirmItem(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.confirmationService.confirm(companyId, id, userId);
  }

  @Post(':id/send-confirmation')
  @Permissions('salary-advance.confirm-item')
  @ApiOperation({ summary: 'Enviar link de confirmação por e-mail/WhatsApp' })
  sendConfirmation(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.confirmationService.sendConfirmation(companyId, id);
  }
}
