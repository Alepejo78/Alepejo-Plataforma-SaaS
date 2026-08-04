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

import { SaleService } from '../services/sale.service';

import { CreateSaleDto } from '../dto/create-sale.dto';
import { SaleFilterDto } from '../dto/sale-filter.dto';

@ApiTags('Sales')
@ApiBearerAuth()
@Controller('sales')
export class SaleController {
  constructor(
    private readonly service: SaleService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Cadastrar venda',
  })
  create(
    @Req() req: Request,
    @Body() dto: CreateSaleDto,
  ) {
    return this.service.create(
      (req as any).user.companyId,
      dto,
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Listar vendas',
  })
  findAll(
    @Req() req: Request,
    @Query() filter: SaleFilterDto,
  ) {
    return this.service.findAll(
      (req as any).user.companyId,
      filter,
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Buscar venda',
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
    summary: 'Aprovar venda',
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

  @Patch(':id/cancel')
  @ApiOperation({
    summary: 'Cancelar aprovação da venda',
  })
  cancelApproval(
    @Req() req: Request,
    @Param('id') id: string,
  ) {
    return this.service.cancelApproval(
      (req as any).user.companyId,
      id,
    );
  }
}