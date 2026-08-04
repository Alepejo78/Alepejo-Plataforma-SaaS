import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import type { Request } from 'express';

import { PurchaseService } from '../services/purchase.service';

import { CreatePurchaseDto } from '../dto/create-purchase.dto';
import { PurchaseFilterDto } from '../dto/purchase-filter.dto';

@ApiTags('Purchases')
@ApiBearerAuth()
@Controller('purchases')
export class PurchaseController {
  constructor(
    private readonly service: PurchaseService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Cadastrar compra',
  })
  create(
    @Req() req: Request,
    @Body() dto: CreatePurchaseDto,
  ) {
    return this.service.create(
      (req as any).user.companyId,
      dto,
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Listar compras',
  })
  findAll(
    @Req() req: Request,
    @Query() filter: PurchaseFilterDto,
  ) {
    return this.service.findAll(
      (req as any).user.companyId,
      filter,
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Buscar compra',
  })
  findOne(
    @Req() req: Request,
    @Param('id') id: string,
  ) {
    return this.service.findOne(
      (req as any).user.companyId,
      id,
    );
  }

  @Patch(':id/approve')
  @ApiOperation({
    summary: 'Aprovar compra',
  })
  approve(
    @Req() req: Request,
    @Param('id') id: string,
  ) {
    return this.service.approve(
      (req as any).user.companyId,
      id,
    );
  }

  @Patch(':id/receive')
  @ApiOperation({
    summary: 'Receber compra',
  })
  receive(
    @Req() req: Request,
    @Param('id') id: string,
  ) {
    return this.service.receive(
      (req as any).user.companyId,
      id,
    );
  }

  @Patch(':id/cancel')
  @ApiOperation({
    summary: 'Cancelar compra',
  })
  cancel(
    @Req() req: Request,
    @Param('id') id: string,
  ) {
    return this.service.cancel(
      (req as any).user.companyId,
      id,
    );
  }
}