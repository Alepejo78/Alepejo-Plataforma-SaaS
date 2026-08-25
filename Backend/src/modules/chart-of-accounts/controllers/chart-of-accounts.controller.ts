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

import { ChartOfAccountsService } from '../services/chart-of-accounts.service';

import { CreateChartOfAccountDto } from '../dto/create-chart-of-account.dto';
import { UpdateChartOfAccountDto } from '../dto/update-chart-of-account.dto';
import { ChartOfAccountFilterDto } from '../dto/chart-of-account-filter.dto';

/** Cadastro de grupo ("Interprise") — companyId aqui é sempre a raiz do grupo (rootCompanyId), ver WarehouseController. */
@Controller('chart-of-accounts')
@Module('FINANCE')
export class ChartOfAccountsController {
  constructor(
    private readonly chartOfAccountsService: ChartOfAccountsService,
  ) {}

  @Post()
  @Permissions('chart-of-account.create')
  create(
    @CurrentUser('rootCompanyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Body() createChartOfAccountDto: CreateChartOfAccountDto,
  ) {
    return this.chartOfAccountsService.create(
      companyId,
      createChartOfAccountDto,
      userId,
    );
  }

  @Get()
  @Permissions('chart-of-account.view')
  findAll(
    @CurrentUser('rootCompanyId') companyId: string,
    @Query() filter: ChartOfAccountFilterDto,
  ) {
    return this.chartOfAccountsService.findAll(companyId, filter);
  }

  @Get(':id')
  @Permissions('chart-of-account.view')
  findOne(
    @CurrentUser('rootCompanyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.chartOfAccountsService.findOne(companyId, id);
  }

  @Patch(':id')
  @Permissions('chart-of-account.update')
  update(
    @CurrentUser('rootCompanyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() updateChartOfAccountDto: UpdateChartOfAccountDto,
  ) {
    return this.chartOfAccountsService.update(
      companyId,
      id,
      updateChartOfAccountDto,
      userId,
    );
  }

  @Delete(':id')
  @Permissions('chart-of-account.delete')
  remove(
    @CurrentUser('rootCompanyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.chartOfAccountsService.remove(companyId, id);
  }
}
