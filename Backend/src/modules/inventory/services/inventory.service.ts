import {
    BadRequestException,
    Injectable,
    NotFoundException,
  } from '@nestjs/common';
  
  import { Inventory } from '@prisma/client';
  
  import { InventoryRepository } from '../repositories/inventory.repository';
  
  import { CreateInventoryDto } from '../dto/create-inventory.dto';
  import { UpdateInventoryDto } from '../dto/update-inventory.dto';
  import { InventoryFilterDto } from '../dto/inventory-filter.dto';
  
  @Injectable()
  export class InventoryService {
    constructor(
      private readonly inventoryRepository: InventoryRepository,
    ) {}
  
    async create(
      createInventoryDto: CreateInventoryDto,
    ): Promise<Inventory> {
      const inventory =
        await this.inventoryRepository.findByProductAndWarehouse(
          createInventoryDto.companyId,
          createInventoryDto.productId,
          createInventoryDto.warehouseId,
        );
  
      if (inventory) {
        throw new BadRequestException(
          'Já existe estoque para este produto neste depósito.',
        );
      }
  
      return this.inventoryRepository.create(
        createInventoryDto,
      );
    }
  
    async findAll(
      filter: InventoryFilterDto,
    ) {
      return this.inventoryRepository.findAll(filter);
    }
  
    async findById(
      id: string,
    ): Promise<Inventory> {
      const inventory =
        await this.inventoryRepository.findById(id);
  
      if (!inventory) {
        throw new NotFoundException(
          'Registro de estoque não encontrado.',
        );
      }
  
      return inventory;
    }
  
    async update(
      id: string,
      updateInventoryDto: UpdateInventoryDto,
    ): Promise<Inventory> {
      await this.findById(id);
  
      return this.inventoryRepository.update(
        id,
        updateInventoryDto,
      );
    }
  
    async remove(
      id: string,
    ): Promise<void> {
      await this.findById(id);
  
      await this.inventoryRepository.delete(id);
    }
  }