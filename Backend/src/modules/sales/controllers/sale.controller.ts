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

import { SaleService } from '../services/sale.service';

import { CreateSaleDto } from '../dto/create-sale.dto';
import { UpdateSaleDto } from '../dto/update-sale.dto';
import { SaleFilterDto } from '../dto/sale-filter.dto';
import { ApproveSaleDto } from '../dto/approve-sale.dto';

@ApiTags('Sales')
@Controller('sales')
@Module('SALES')
export class SaleController {
  constructor(
    private readonly service: SaleService,
  ) {}

  @Post()
  @Permissions('sale.create')
  @ApiOperation({
    summary: 'Cadastrar venda',
  })
  create(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('rootCompanyId') rootCompanyId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateSaleDto,
  ) {
    return this.service.create(
      companyId,
      rootCompanyId,
      dto,
      userId,
    );
  }

  @Get()
  @Permissions('sale.view')
  @ApiOperation({
    summary: 'Listar vendas',
  })
  findAll(
    @CurrentUser('companyId') companyId: string,
    @Query() filter: SaleFilterDto,
  ) {
    return this.service.findAll(
      companyId,
      filter,
    );
  }

  @Get(':id')
  @Permissions('sale.view')
  @ApiOperation({
    summary: 'Buscar venda',
  })
  findOne(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.findOne(
      companyId,
      id,
    );
  }

  @Patch(':id')
  @Permissions('sale.update')
  @ApiOperation({
    summary: 'Alterar venda',
  })
  update(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('rootCompanyId') rootCompanyId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSaleDto,
  ) {
    return this.service.update(
      companyId,
      rootCompanyId,
      id,
      dto,
      userId,
    );
  }

  @Patch(':id/approve')
  @Permissions('sale.approve')
  @ApiOperation({
    summary: 'Aprovar venda',
  })
  approve(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: ApproveSaleDto,
  ) {
    return this.service.approve(
      companyId,
      id,
      dto,
      userId,
    );
  }

  @Patch(':id/cancel')
  @Permissions('sale.cancel')
  @ApiOperation({
    summary: 'Cancelar venda (devolve estoque e cancela título gerado, quando aplicável)',
  })
  cancel(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.service.cancel(
      companyId,
      id,
      userId,
    );
  }

  @Delete(':id')
  @Permissions('sale.delete')
  @ApiOperation({
    summary: 'Excluir venda cancelada',
  })
  remove(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.remove(
      companyId,
      id,
    );
  }
}