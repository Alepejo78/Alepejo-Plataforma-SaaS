import {
    BadRequestException,
    Injectable,
    NotFoundException,
  } from '@nestjs/common';
  
  import {
    Inventory,
    StockMovement,
    StockMovementType,
  } from '@prisma/client';
  
  import { PrismaService } from '../../../core/prisma/prisma.service';
  
  import { CreateStockMovementDto } from '../dto/create-stock-movement.dto';
  import { StockMovementFilterDto } from '../dto/stock-movement-filter.dto';
  import { StockMovementRepository } from '../repositories/stock-movement.repository';
  
  @Injectable()
  export class StockMovementService {
    constructor(
      private readonly repository: StockMovementRepository,
      private readonly prisma: PrismaService,
    ) {}
  
    async create(
      companyId: string,
      dto: CreateStockMovementDto,
    ): Promise<StockMovement> {
      const inventory = await this.prisma.inventory.findFirst({
        where: {
          id: dto.inventoryId,
          companyId,
        },
      });
  
      if (!inventory) {
        throw new NotFoundException(
          'Registro de estoque não encontrado.',
        );
      }
  
      await this.updateInventoryBalance(
        inventory,
        dto,
      );
  
      return this.repository.create(
        companyId,
        dto,
      );
    }
  
    async findAll(
      companyId: string,
      filter: StockMovementFilterDto,
    ) {
      return this.repository.findAll(
        companyId,
        filter,
      );
    }
  
    async findOne(
      companyId: string,
      id: string,
    ) {
      const movement =
        await this.repository.findById(
          companyId,
          id,
        );
  
      if (!movement) {
        throw new NotFoundException(
          'Movimentação não encontrada.',
        );
      }
  
      return movement;
    }
  
    private async updateInventoryBalance(
      inventory: Inventory,
      dto: CreateStockMovementDto,
    ) {
      let quantity = Number(
        inventory.quantity,
      );
  
      switch (dto.type) {
        case StockMovementType.ENTRY:
          quantity += dto.quantity;
          break;
  
        case StockMovementType.EXIT:
          if (quantity < dto.quantity) {
            throw new BadRequestException(
              'Saldo insuficiente.',
            );
          }
  
          quantity -= dto.quantity;
          break;
  
        case StockMovementType.ADJUSTMENT:
          quantity = dto.quantity;
          break;
  
        default:
          break;
      }
  
      await this.prisma.inventory.update({
        where: {
          id: inventory.id,
        },
        data: {
          quantity,
        },
      });
    }
  }