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

import { InventoryCountService } from '../services/inventory-count.service';

import { CreateInventoryCountDto } from '../dto/create-inventory-count.dto';
import { UpdateInventoryCountDto } from '../dto/update-inventory-count.dto';
import { InventoryCountFilterDto } from '../dto/inventory-count-filter.dto';

@ApiTags('Inventory Counts')
@Controller('inventory-counts')
@Module('INVENTORY')
export class InventoryCountController {
  constructor(
    private readonly service: InventoryCountService,
  ) {}

  @Post()
  @Permissions('inventory-count.create')
  @ApiOperation({ summary: 'Cadastrar contagem de inventário' })
  create(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('rootCompanyId') rootCompanyId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateInventoryCountDto,
  ) {
    return this.service.create(companyId, rootCompanyId, dto, userId);
  }

  @Get()
  @Permissions('inventory-count.view')
  @ApiOperation({ summary: 'Listar contagens de inventário' })
  findAll(
    @CurrentUser('companyId') companyId: string,
    @Query() filter: InventoryCountFilterDto,
  ) {
    return this.service.findAll(companyId, filter);
  }

  @Get(':id')
  @Permissions('inventory-count.view')
  @ApiOperation({ summary: 'Buscar contagem de inventário' })
  findOne(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.findOne(companyId, id);
  }

  @Patch(':id')
  @Permissions('inventory-count.update')
  @ApiOperation({ summary: 'Alterar contagem de inventário' })
  update(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('rootCompanyId') rootCompanyId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateInventoryCountDto,
  ) {
    return this.service.update(
      companyId,
      rootCompanyId,
      id,
      dto,
      userId,
    );
  }

  @Patch(':id/finalize')
  @Permissions('inventory-count.approve')
  @ApiOperation({
    summary:
      'Finalizar contagem — gera os ajustes de estoque necessários',
  })
  finalize(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.service.finalize(companyId, id, userId);
  }

  @Patch(':id/cancel')
  @Permissions('inventory-count.cancel')
  @ApiOperation({ summary: 'Cancelar contagem de inventário' })
  cancel(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.service.cancel(companyId, id, userId);
  }

  @Delete(':id')
  @Permissions('inventory-count.delete')
  @ApiOperation({ summary: 'Excluir contagem de inventário cancelada' })
  remove(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.remove(companyId, id);
  }
}
