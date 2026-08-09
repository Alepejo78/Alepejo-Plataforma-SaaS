import {
  Body,
  Controller,
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
    @Body() dto: CreateSaleDto,
  ) {
    return this.service.create(
      companyId,
      dto,
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

  @Patch(':id/approve')
  @Permissions('sale.approve')
  @ApiOperation({
    summary: 'Aprovar venda',
  })
  approve(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: ApproveSaleDto,
  ) {
    return this.service.approve(
      companyId,
      id,
      dto,
    );
  }

  @Patch(':id/cancel')
  @Permissions('sale.cancel')
  @ApiOperation({
    summary: 'Cancelar aprovação da venda',
  })
  cancelApproval(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.cancelApproval(
      companyId,
      id,
    );
  }
}