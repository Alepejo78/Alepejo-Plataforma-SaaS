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

import { FinancialEntryType } from '@prisma/client';

import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { Permissions } from '../../identity/auth/decorators/permissions.decorator';
import { Module } from '../../identity/license/decorators/module.decorator';

import { FinancialEntriesService } from '../services/financial-entries.service';

import { CreateFinancialEntryDto } from '../dto/create-financial-entry.dto';
import { UpdateFinancialEntryDto } from '../dto/update-financial-entry.dto';
import { SettleFinancialEntryDto } from '../dto/settle-financial-entry.dto';
import { FinancialEntryFilterDto } from '../dto/financial-entry-filter.dto';

@Controller('financial-entries')
@Module('FINANCE')
export class FinancialEntriesController {
  constructor(
    private readonly service: FinancialEntriesService,
  ) {}

  @Post()
  @Permissions('financial-entry.create')
  create(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('rootCompanyId') rootCompanyId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateFinancialEntryDto,
  ) {
    return this.service.create(companyId, rootCompanyId, dto, userId);
  }

  @Get()
  @Permissions('financial-entry.view')
  findAll(
    @CurrentUser('companyId') companyId: string,
    @Query() filter: FinancialEntryFilterDto,
  ) {
    return this.service.findAll(companyId, filter);
  }

  @Get('cash-flow')
  @Permissions('financial-entry.view')
  getCashFlow(
    @CurrentUser('companyId') companyId: string,
    @Query('year') year?: string,
  ) {
    const parsedYear = Number(year);
    const targetYear =
      year && Number.isInteger(parsedYear)
        ? parsedYear
        : new Date().getFullYear();

    return this.service.getCashFlow(companyId, targetYear);
  }

  @Get('period-summary')
  @Permissions('financial-entry.view')
  getPeriodSummary(
    @CurrentUser('companyId') companyId: string,
    @Query('period') period?: string,
    @Query('date') date?: string,
  ) {
    const targetPeriod =
      period === 'day' || period === 'week' || period === 'month'
        ? period
        : 'day';

    const referenceDate = date ? new Date(date) : new Date();

    return this.service.getPeriodSummary(
      companyId,
      targetPeriod,
      referenceDate,
    );
  }

  @Get('account-breakdown')
  @Permissions('financial-entry.view')
  getAccountBreakdown(
    @CurrentUser('companyId') companyId: string,
    @Query('year') year?: string,
    @Query('type') type?: string,
  ) {
    const parsedYear = Number(year);
    const targetYear =
      year && Number.isInteger(parsedYear)
        ? parsedYear
        : new Date().getFullYear();

    // Padrão despesa: é o acompanhamento que o usuário pediu; receita
    // sai pelo mesmo endereço trocando o parâmetro.
    const targetType =
      type === 'RECEIVABLE'
        ? FinancialEntryType.RECEIVABLE
        : FinancialEntryType.PAYABLE;

    return this.service.getAccountBreakdown(
      companyId,
      targetYear,
      targetType,
    );
  }

  @Get('payment-method-breakdown')
  @Permissions('financial-entry.view')
  getPaymentMethodBreakdown(
    @CurrentUser('companyId') companyId: string,
    @Query('year') year?: string,
    @Query('type') type?: string,
  ) {
    const parsedYear = Number(year);
    const targetYear =
      year && Number.isInteger(parsedYear)
        ? parsedYear
        : new Date().getFullYear();

    const targetType =
      type === 'RECEIVABLE'
        ? FinancialEntryType.RECEIVABLE
        : FinancialEntryType.PAYABLE;

    return this.service.getPaymentMethodBreakdown(
      companyId,
      targetYear,
      targetType,
    );
  }

  @Get(':id')
  @Permissions('financial-entry.view')
  findOne(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.findOne(companyId, id);
  }

  @Patch(':id')
  @Permissions('financial-entry.update')
  update(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('rootCompanyId') rootCompanyId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateFinancialEntryDto,
  ) {
    return this.service.update(companyId, rootCompanyId, id, dto, userId);
  }

  @Patch(':id/settle')
  @Permissions('financial-entry.settle')
  settle(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: SettleFinancialEntryDto,
  ) {
    return this.service.settle(companyId, id, dto, userId);
  }

  @Patch(':id/reopen')
  @Permissions('financial-entry.settle')
  reopen(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.service.reopen(companyId, id, userId);
  }

  @Patch(':id/cancel')
  @Permissions('financial-entry.cancel')
  cancel(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.service.cancel(companyId, id, userId);
  }

  @Delete(':id')
  @Permissions('financial-entry.delete')
  remove(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.remove(companyId, id);
  }
}
