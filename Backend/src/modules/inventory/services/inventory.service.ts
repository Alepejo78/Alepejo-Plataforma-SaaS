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
      companyId: string,
      createInventoryDto: CreateInventoryDto,
    ): Promise<Inventory> {
      const inventory =
        await this.inventoryRepository.findByProductAndWarehouse(
          companyId,
          createInventoryDto.productId,
          createInventoryDto.warehouseId,
        );

      if (inventory) {
        throw new BadRequestException(
          'Já existe estoque para este produto neste depósito.',
        );
      }

      return this.inventoryRepository.create(
        companyId,
        createInventoryDto,
      );
    }

    async findAll(
      companyId: string,
      filter: InventoryFilterDto,
    ) {
      return this.inventoryRepository.findAll(companyId, filter);
    }

    async findById(
      companyId: string,
      id: string,
    ): Promise<Inventory> {
      const inventory =
        await this.inventoryRepository.findById(companyId, id);

      if (!inventory) {
        throw new NotFoundException(
          'Registro de estoque não encontrado.',
        );
      }

      return inventory;
    }

    async update(
      companyId: string,
      id: string,
      updateInventoryDto: UpdateInventoryDto,
    ): Promise<Inventory> {
      await this.findById(companyId, id);

      return this.inventoryRepository.update(
        id,
        updateInventoryDto,
      );
    }

    async remove(
      companyId: string,
      id: string,
    ): Promise<void> {
      await this.findById(companyId, id);

      await this.inventoryRepository.delete(id);
    }
  }
