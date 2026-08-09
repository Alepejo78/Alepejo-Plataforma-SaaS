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
    @Body() dto: CreateFinancialEntryDto,
  ) {
    return this.service.create(companyId, dto);
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
    @Param('id') id: string,
    @Body() dto: UpdateFinancialEntryDto,
  ) {
    return this.service.update(companyId, id, dto);
  }

  @Patch(':id/settle')
  @Permissions('financial-entry.settle')
  settle(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: SettleFinancialEntryDto,
  ) {
    return this.service.settle(companyId, id, dto);
  }

  @Patch(':id/reopen')
  @Permissions('financial-entry.settle')
  reopen(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.reopen(companyId, id);
  }

  @Patch(':id/cancel')
  @Permissions('financial-entry.cancel')
  cancel(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.cancel(companyId, id);
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
