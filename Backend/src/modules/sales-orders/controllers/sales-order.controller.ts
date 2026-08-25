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

import { SalesOrderService } from '../services/sales-order.service';

import { CreateSalesOrderDto } from '../dto/create-sales-order.dto';
import { UpdateSalesOrderDto } from '../dto/update-sales-order.dto';
import { SalesOrderFilterDto } from '../dto/sales-order-filter.dto';

@ApiTags('Sales Orders')
@Controller('sales-orders')
@Module('SALES')
export class SalesOrderController {
  constructor(private readonly service: SalesOrderService) {}

  @Post()
  @Permissions('sales-order.create')
  @ApiOperation({ summary: 'Cadastrar pedido de venda' })
  create(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('rootCompanyId') rootCompanyId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateSalesOrderDto,
  ) {
    return this.service.create(companyId, rootCompanyId, dto, userId);
  }

  @Get()
  @Permissions('sales-order.view')
  @ApiOperation({ summary: 'Listar pedidos de venda' })
  findAll(
    @CurrentUser('companyId') companyId: string,
    @Query() filter: SalesOrderFilterDto,
  ) {
    return this.service.findAll(companyId, filter);
  }

  @Get(':id')
  @Permissions('sales-order.view')
  @ApiOperation({ summary: 'Buscar pedido de venda' })
  findOne(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.findOne(companyId, id);
  }

  @Patch(':id')
  @Permissions('sales-order.update')
  @ApiOperation({ summary: 'Alterar pedido de venda' })
  update(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('rootCompanyId') rootCompanyId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSalesOrderDto,
  ) {
    return this.service.update(companyId, rootCompanyId, id, dto, userId);
  }

  @Patch(':id/cancel')
  @Permissions('sales-order.cancel')
  @ApiOperation({ summary: 'Cancelar pedido de venda' })
  cancel(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.service.cancel(companyId, id, userId);
  }
}
