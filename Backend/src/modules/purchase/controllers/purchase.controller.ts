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

import { PurchaseService } from '../services/purchase.service';

import { CreatePurchaseDto } from '../dto/create-purchase.dto';
import { PurchaseFilterDto } from '../dto/purchase-filter.dto';

@ApiTags('Purchases')
@Controller('purchases')
@Module('PURCHASE')
export class PurchaseController {
  constructor(
    private readonly service: PurchaseService,
  ) {}

  @Post()
  @Permissions('purchase.create')
  @ApiOperation({
    summary: 'Cadastrar compra',
  })
  create(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: CreatePurchaseDto,
  ) {
    return this.service.create(
      companyId,
      dto,
    );
  }

  @Get()
  @Permissions('purchase.view')
  @ApiOperation({
    summary: 'Listar compras',
  })
  findAll(
    @CurrentUser('companyId') companyId: string,
    @Query() filter: PurchaseFilterDto,
  ) {
    return this.service.findAll(
      companyId,
      filter,
    );
  }

  @Get(':id')
  @Permissions('purchase.view')
  @ApiOperation({
    summary: 'Buscar compra',
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
  @Permissions('purchase.approve')
  @ApiOperation({
    summary: 'Aprovar compra',
  })
  approve(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.approve(
      companyId,
      id,
    );
  }

  @Patch(':id/receive')
  @Permissions('purchase.receive')
  @ApiOperation({
    summary: 'Receber compra',
  })
  receive(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.receive(
      companyId,
      id,
    );
  }

  @Patch(':id/cancel')
  @Permissions('purchase.cancel')
  @ApiOperation({
    summary: 'Cancelar compra',
  })
  cancel(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.cancel(
      companyId,
      id,
    );
  }
}