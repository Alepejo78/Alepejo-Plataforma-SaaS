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
import { Permissions } from '../../identity/auth/decorators/permissions.decorator';
import { Module } from '../../identity/license/decorators/module.decorator';

import { PurchaseOrderService } from '../services/purchase-order.service';

import { CreatePurchaseOrderDto } from '../dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from '../dto/update-purchase-order.dto';
import { PurchaseOrderFilterDto } from '../dto/purchase-order-filter.dto';

@ApiTags('Purchase Orders')
@Controller('purchase-orders')
@Module('PURCHASE')
export class PurchaseOrderController {
  constructor(
    private readonly service: PurchaseOrderService,
  ) {}

  @Post()
  @Permissions('purchase-order.create')
  @ApiOperation({ summary: 'Cadastrar pedido de compra' })
  create(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('rootCompanyId') rootCompanyId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePurchaseOrderDto,
  ) {
    return this.service.create(companyId, rootCompanyId, dto, userId);
  }

  @Get()
  @Permissions('purchase-order.view')
  @ApiOperation({ summary: 'Listar pedidos de compra' })
  findAll(
    @CurrentUser('companyId') companyId: string,
    @Query() filter: PurchaseOrderFilterDto,
  ) {
    return this.service.findAll(companyId, filter);
  }

  @Get(':id')
  @Permissions('purchase-order.view')
  @ApiOperation({ summary: 'Buscar pedido de compra' })
  findOne(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.findOne(companyId, id);
  }

  @Patch(':id')
  @Permissions('purchase-order.update')
  @ApiOperation({ summary: 'Alterar pedido de compra' })
  update(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('rootCompanyId') rootCompanyId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePurchaseOrderDto,
  ) {
    return this.service.update(companyId, rootCompanyId, id, dto, userId);
  }

  @Patch(':id/cancel')
  @Permissions('purchase-order.cancel')
  @ApiOperation({ summary: 'Cancelar pedido de compra' })
  cancel(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.service.cancel(companyId, id, userId);
  }

  @Delete(':id')
  @Permissions('purchase-order.delete')
  @ApiOperation({ summary: 'Excluir pedido de compra cancelado' })
  remove(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.remove(companyId, id);
  }

  @Patch(':id/reopen')
  @Permissions('purchase-order.cancel')
  @ApiOperation({ summary: 'Estornar pedido convertido em compra' })
  reopen(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.service.reopen(companyId, id, userId);
  }

  @Patch(':id/close-balance')
  @Permissions('purchase-order.cancel')
  @ApiOperation({ summary: 'Zerar saldo restante do pedido de compra' })
  closeBalance(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.service.closeBalance(companyId, id, userId);
  }
}
