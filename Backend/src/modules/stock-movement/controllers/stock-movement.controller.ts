import {
    Body,
    Controller,
    Get,
    Param,
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
  
  import { StockMovementService } from '../services/stock-movement.service';
  
  import { CreateStockMovementDto } from '../dto/create-stock-movement.dto';
  import { StockMovementFilterDto } from '../dto/stock-movement-filter.dto';
  
  @ApiTags('Stock Movements')
  @ApiBearerAuth()
  @Controller('stock-movements')
  export class StockMovementController {
    constructor(
      private readonly service: StockMovementService,
    ) {}
  
    @Post()
    @ApiOperation({
      summary: 'Registrar movimentação de estoque',
    })
    create(
      @Req() req: Request,
      @Body() dto: CreateStockMovementDto,
    ) {
      return this.service.create(
        (req as any).user.companyId,
        dto,
      );
    }
  
    @Get()
    @ApiOperation({
      summary: 'Listar movimentações',
    })
    findAll(
      @Req() req: Request,
      @Query() filter: StockMovementFilterDto,
    ) {
      return this.service.findAll(
        (req as any).user.companyId,
        filter,
      );
    }
  
    @Get(':id')
    @ApiOperation({
      summary: 'Buscar movimentação',
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
  }