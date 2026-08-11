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

import { ProductionOrdersService } from '../services/production-orders.service';

import { CreateProductionOrderDto } from '../dto/create-production-order.dto';
import { UpdateProductionOrderDto } from '../dto/update-production-order.dto';
import { ProductionOrderFilterDto } from '../dto/production-order-filter.dto';

@ApiTags('Production Orders')
@Controller('production-orders')
@Module('PRODUCTION')
export class ProductionOrderController {
  constructor(
    private readonly service: ProductionOrdersService,
  ) {}

  @Post()
  @Permissions('production-order.create')
  @ApiOperation({ summary: 'Cadastrar ordem de produção' })
  create(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: CreateProductionOrderDto,
  ) {
    return this.service.create(companyId, dto);
  }

  @Get()
  @Permissions('production-order.view')
  @ApiOperation({ summary: 'Listar ordens de produção' })
  findAll(
    @CurrentUser('companyId') companyId: string,
    @Query() filter: ProductionOrderFilterDto,
  ) {
    return this.service.findAll(companyId, filter);
  }

  @Get(':id')
  @Permissions('production-order.view')
  @ApiOperation({ summary: 'Buscar ordem de produção' })
  findOne(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.findOne(companyId, id);
  }

  @Patch(':id')
  @Permissions('production-order.update')
  @ApiOperation({ summary: 'Alterar ordem de produção' })
  update(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProductionOrderDto,
  ) {
    return this.service.update(companyId, id, dto);
  }

  @Patch(':id/cancel')
  @Permissions('production-order.cancel')
  @ApiOperation({ summary: 'Cancelar ordem de produção' })
  cancel(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.cancel(companyId, id);
  }

  @Patch(':id/complete')
  @Permissions('production-order.complete')
  @ApiOperation({
    summary: 'Concluir ordem de produção (gera entrada de estoque)',
  })
  complete(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.complete(companyId, id);
  }

  @Patch(':id/undo-complete')
  @Permissions('production-order.complete')
  @ApiOperation({
    summary: 'Estornar conclusão (desfaz a entrada de estoque)',
  })
  undoComplete(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.undoComplete(companyId, id);
  }
}
