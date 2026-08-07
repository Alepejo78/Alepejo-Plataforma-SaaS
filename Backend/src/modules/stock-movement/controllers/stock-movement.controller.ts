import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    Query,
  } from '@nestjs/common';
  
  import {
    ApiOperation,
    ApiTags,
  } from '@nestjs/swagger';
  
    
  import { StockMovementService } from '../services/stock-movement.service';
  
  import { CreateStockMovementDto } from '../dto/create-stock-movement.dto';
  import { StockMovementFilterDto } from '../dto/stock-movement-filter.dto';
  
  @ApiTags('Stock Movements')
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
      @CurrentUser('companyId') companyId: string,
      @Body() dto: CreateStockMovementDto,
    ) {
      return this.service.create(
        companyId,
        dto,
      );
    }
  
    @Get()
    @ApiOperation({
      summary: 'Listar movimentações',
    })
    findAll(
      @CurrentUser('companyId') companyId: string,
      @Query() filter: StockMovementFilterDto,
    ) {
      return this.service.findAll(
        companyId,
        filter,
      );
    }
  
    @Get(':id')
    @ApiOperation({
      summary: 'Buscar movimentação',
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
  }