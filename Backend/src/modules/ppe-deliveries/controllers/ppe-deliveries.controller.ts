import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';

import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { Permissions } from '../../identity/auth/decorators/permissions.decorator';
import { Module } from '../../identity/license/decorators/module.decorator';

import { PpeDeliveriesService } from '../services/ppe-deliveries.service';

import { CreatePpeDeliveryDto } from '../dto/create-ppe-delivery.dto';
import { PpeDeliveryFilterDto } from '../dto/ppe-delivery-filter.dto';

@Controller('ppe-deliveries')
@Module('HR')
export class PpeDeliveriesController {
  constructor(private readonly service: PpeDeliveriesService) {}

  @Post()
  @Permissions('ppe-delivery.create')
  create(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: CreatePpeDeliveryDto,
  ) {
    return this.service.create(companyId, dto);
  }

  @Get()
  @Permissions('ppe-delivery.view')
  findAll(
    @CurrentUser('companyId') companyId: string,
    @Query() filter: PpeDeliveryFilterDto,
  ) {
    return this.service.findAll(companyId, filter);
  }

  @Get(':id')
  @Permissions('ppe-delivery.view')
  findOne(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.findOne(companyId, id);
  }

  @Delete(':id')
  @Permissions('ppe-delivery.delete')
  remove(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.remove(companyId, id);
  }
}
