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

import { PurchaseService } from '../services/purchase.service';

import { CreatePurchaseDto } from '../dto/create-purchase.dto';
import { UpdatePurchaseDto } from '../dto/update-purchase.dto';
import { PurchaseFilterDto } from '../dto/purchase-filter.dto';
import { ReceivePurchaseDto } from '../dto/receive-purchase.dto';

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
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePurchaseDto,
  ) {
    return this.service.create(
      companyId,
      dto,
      userId,
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

  @Patch(':id')
  @Permissions('purchase.update')
  @ApiOperation({
    summary: 'Alterar compra (somente rascunho)',
  })
  update(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePurchaseDto,
  ) {
    return this.service.update(
      companyId,
      id,
      dto,
      userId,
    );
  }

  @Patch(':id/approve')
  @Permissions('purchase.approve')
  @ApiOperation({
    summary: 'Aprovar compra',
  })
  approve(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.service.approve(
      companyId,
      id,
      userId,
    );
  }

  @Patch(':id/receive')
  @Permissions('purchase.receive')
  @ApiOperation({
    summary: 'Receber compra',
  })
  receive(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: ReceivePurchaseDto,
  ) {
    return this.service.receive(
      companyId,
      id,
      dto,
      userId,
    );
  }

  @Patch(':id/unreceive')
  @Permissions('purchase.receive')
  @ApiOperation({
    summary: 'Estornar recebimento da compra',
  })
  unreceive(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.service.unreceive(
      companyId,
      id,
      userId,
    );
  }

  @Patch(':id/cancel')
  @Permissions('purchase.cancel')
  @ApiOperation({
    summary: 'Cancelar compra',
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
  @Permissions('purchase.delete')
  @ApiOperation({
    summary: 'Excluir compra cancelada',
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