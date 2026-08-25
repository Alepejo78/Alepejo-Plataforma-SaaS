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

/**
 * Depósito é cadastro de grupo ("Interprise") — `companyId` aqui é
 * sempre a raiz do grupo (`rootCompanyId`), não a empresa ativa da
 * sessão, pra todas as empresas do mesmo grupo enxergarem os mesmos
 * depósitos. Service/repository não mudam: continuam recebendo um
 * `companyId` normal, só a origem do valor é diferente.
 */
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
    @CurrentUser('rootCompanyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateWarehouseDto,
  ) {
    return this.warehouseService.create(
      companyId,
      dto,
      userId,
    );
  }

  @Get()
  @Permissions('warehouse.view')
  @ApiOperation({
    summary: 'Listar depósitos',
  })
  findAll(
    @CurrentUser('rootCompanyId') companyId: string,
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
    @CurrentUser('rootCompanyId') companyId: string,
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
    @CurrentUser('rootCompanyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateWarehouseDto,
  ) {
    return this.warehouseService.update(
      companyId,
      id,
      dto,
      userId,
    );
  }

  @Delete(':id')
  @Permissions('warehouse.delete')
  @ApiOperation({
    summary: 'Excluir depósito',
  })
  remove(
    @CurrentUser('rootCompanyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.warehouseService.remove(
      companyId,
      id,
    );
  }
}