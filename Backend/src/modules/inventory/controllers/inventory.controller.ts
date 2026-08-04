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
  
  import { InventoryService } from '../services/inventory.service';
  
  import { CreateInventoryDto } from '../dto/create-inventory.dto';
  import { UpdateInventoryDto } from '../dto/update-inventory.dto';
  import { InventoryFilterDto } from '../dto/inventory-filter.dto';
  
  @Controller('inventory')
  export class InventoryController {
    constructor(
      private readonly inventoryService: InventoryService,
    ) {}
  
    @Post()
    async create(
      @Body()
      createInventoryDto: CreateInventoryDto,
    ) {
      return this.inventoryService.create(
        createInventoryDto,
      );
    }
  
    @Get()
    async findAll(
      @Query()
      filter: InventoryFilterDto,
    ) {
      return this.inventoryService.findAll(
        filter,
      );
    }
  
    @Get(':id')
    async findById(
      @Param('id')
      id: string,
    ) {
      return this.inventoryService.findById(
        id,
      );
    }
  
    @Patch(':id')
    async update(
      @Param('id')
      id: string,
  
      @Body()
      updateInventoryDto: UpdateInventoryDto,
    ) {
      return this.inventoryService.update(
        id,
        updateInventoryDto,
      );
    }
  
    @Delete(':id')
    async remove(
      @Param('id')
      id: string,
    ) {
      await this.inventoryService.remove(id);
  
      return {
        success: true,
        message:
          'Registro de estoque removido com sucesso.',
      };
    }
  }