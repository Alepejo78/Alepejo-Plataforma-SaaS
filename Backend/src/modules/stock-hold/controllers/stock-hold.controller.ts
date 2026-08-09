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

import { StockHoldService } from '../services/stock-hold.service';

import { CreateStockHoldDto } from '../dto/create-stock-hold.dto';
import { StockHoldFilterDto } from '../dto/stock-hold-filter.dto';

@ApiTags('Stock Holds')
@Controller('stock-holds')
@Module('INVENTORY')
export class StockHoldController {
  constructor(private readonly service: StockHoldService) {}

  @Post()
  @Permissions('inventory.hold')
  @ApiOperation({
    summary:
      'Bloquear, reservar, colocar em quarentena ou marcar como avariada uma quantidade do estoque',
  })
  create(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: CreateStockHoldDto,
  ) {
    return this.service.create(companyId, dto);
  }

  @Get()
  @Permissions('inventory.view')
  @ApiOperation({
    summary: 'Listar retenções de estoque',
  })
  findAll(
    @CurrentUser('companyId') companyId: string,
    @Query() filter: StockHoldFilterDto,
  ) {
    return this.service.findAll(companyId, filter);
  }

  @Patch(':id/release')
  @Permissions('inventory.release-hold')
  @ApiOperation({
    summary: 'Liberar uma retenção de estoque',
  })
  release(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.release(companyId, id);
  }
}
