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

import {
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { Permissions } from '../../identity/auth/decorators/permissions.decorator';

import { Module } from '../../identity/license/decorators/module.decorator';

import { WarehouseService } from '../services/warehouse.service';
import { CreateWarehouseDto } from '../dto/create-warehouse.dto';
import { UpdateWarehouseDto } from '../dto/update-warehouse.dto';
import { WarehouseFilterDto } from '../dto/warehouse-filter.dto';

@ApiTags('Warehouses')
@Controller('warehouses')
@Module('INVENTORY')
export class WarehouseController {
  constructor(
    private readonly warehouseService: WarehouseService,
  ) {}

  @Post()
  @Permissions('warehouse.create')
  @ApiOperation({
    summary: 'Cadastrar depósito',
  })
  create(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: CreateWarehouseDto,
  ) {
    return this.warehouseService.create(
      companyId,
      dto,
    );
  }

  @Get()
  @Permissions('warehouse.view')
  @ApiOperation({
    summary: 'Listar depósitos',
  })
  findAll(
    @CurrentUser('companyId') companyId: string,
    @Query() filter: WarehouseFilterDto,
  ) {
    return this.warehouseService.findAll(
      companyId,
      filter,
    );
  }

  @Get(':id')
  @Permissions('warehouse.view')
  @ApiOperation({
    summary: 'Buscar depósito',
  })
  findOne(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.warehouseService.findOne(
      companyId,
      id,
    );
  }

  @Patch(':id')
  @Permissions('warehouse.update')
  @ApiOperation({
    summary: 'Alterar depósito',
  })
  update(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateWarehouseDto,
  ) {
    return this.warehouseService.update(
      companyId,
      id,
      dto,
    );
  }

  @Delete(':id')
  @Permissions('warehouse.delete')
  @ApiOperation({
    summary: 'Excluir depósito',
  })
  remove(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.warehouseService.remove(
      companyId,
      id,
    );
  }
}