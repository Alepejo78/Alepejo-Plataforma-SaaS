import {
    Body,
    Controller,
    Delete,
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
  
  import { WarehouseService } from '../services/warehouse.service';
  import { CreateWarehouseDto } from '../dto/create-warehouse.dto';
  import { UpdateWarehouseDto } from '../dto/update-warehouse.dto';
  import { WarehouseFilterDto } from '../dto/warehouse-filter.dto';
  
  @ApiTags('Warehouses')
  @ApiBearerAuth()
  @Controller('warehouses')
  export class WarehouseController {
    constructor(
      private readonly warehouseService: WarehouseService,
    ) {}
  
    @Post()
    @ApiOperation({ summary: 'Cadastrar depósito' })
    create(
      @Req() req: Request,
      @Body() dto: CreateWarehouseDto,
    ) {
      return this.warehouseService.create(
        (req as any).user.companyId,
        dto,
      );
    }
  
    @Get()
    @ApiOperation({ summary: 'Listar depósitos' })
    findAll(
      @Req() req: Request,
      @Query() filter: WarehouseFilterDto,
    ) {
      return this.warehouseService.findAll(
        (req as any).user.companyId,
        filter,
      );
    }
  
    @Get(':id')
    @ApiOperation({ summary: 'Buscar depósito' })
    findOne(
      @Req() req: Request,
      @Param('id') id: string,
    ) {
      return this.warehouseService.findOne(
        (req as any).user.companyId,
        id,
      );
    }
  
    @Patch(':id')
    @ApiOperation({ summary: 'Alterar depósito' })
    update(
      @Req() req: Request,
      @Param('id') id: string,
      @Body() dto: UpdateWarehouseDto,
    ) {
      return this.warehouseService.update(
        (req as any).user.companyId,
        id,
        dto,
      );
    }
  
    @Delete(':id')
    @ApiOperation({ summary: 'Excluir depósito' })
    remove(
      @Req() req: Request,
      @Param('id') id: string,
    ) {
      return this.warehouseService.remove(
        (req as any).user.companyId,
        id,
      );
    }
  }