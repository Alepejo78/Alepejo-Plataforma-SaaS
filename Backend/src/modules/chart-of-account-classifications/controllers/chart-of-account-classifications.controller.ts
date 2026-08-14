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

import { ChartOfAccountClassificationsService } from '../services/chart-of-account-classifications.service';

import { CreateChartOfAccountClassificationDto } from '../dto/create-chart-of-account-classification.dto';
import { UpdateChartOfAccountClassificationDto } from '../dto/update-chart-of-account-classification.dto';
import { ChartOfAccountClassificationFilterDto } from '../dto/chart-of-account-classification-filter.dto';

/** Cadastro de grupo ("Interprise") — companyId aqui é sempre a raiz do grupo (rootCompanyId), ver WarehouseController. */
@Controller('chart-of-account-classifications')
@Module('FINANCE')
export class ChartOfAccountClassificationsController {
  constructor(
    private readonly service: ChartOfAccountClassificationsService,
  ) {}

  @Post()
  @Permissions('chart-of-account-classification.create')
  create(
    @CurrentUser('rootCompanyId') companyId: string,
    @Body() dto: CreateChartOfAccountClassificationDto,
  ) {
    return this.service.create(companyId, dto);
  }

  @Get()
  @Permissions('chart-of-account-classification.view')
  findAll(
    @CurrentUser('rootCompanyId') companyId: string,
    @Query() filter: ChartOfAccountClassificationFilterDto,
  ) {
    return this.service.findAll(companyId, filter);
  }

  @Get(':id')
  @Permissions('chart-of-account-classification.view')
  findOne(
    @CurrentUser('rootCompanyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.findOne(companyId, id);
  }

  @Patch(':id')
  @Permissions('chart-of-account-classification.update')
  update(
    @CurrentUser('rootCompanyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateChartOfAccountClassificationDto,
  ) {
    return this.service.update(companyId, id, dto);
  }

  @Delete(':id')
  @Permissions('chart-of-account-classification.delete')
  remove(
    @CurrentUser('rootCompanyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.remove(companyId, id);
  }
}
