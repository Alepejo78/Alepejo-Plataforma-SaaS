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
  import { ProductionOrdersService } from '../../production/services/production-orders.service';

  import { CreateStockMovementDto } from '../dto/create-stock-movement.dto';
  import { StockMovementFilterDto } from '../dto/stock-movement-filter.dto';
  import { StockMovementRepository } from '../repositories/stock-movement.repository';

  @Injectable()
  export class StockMovementService {
    constructor(
      private readonly repository: StockMovementRepository,
      private readonly prisma: PrismaService,
      private readonly productionOrdersService: ProductionOrdersService,
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

      const movement = await this.repository.create(
        companyId,
        dto,
      );

      // Best-effort: saída/ajuste que reduz saldo pode ter derrubado
      // o produto pro mínimo — ver
      // ProductionOrdersService.autoGenerateForLowStock.
      if (
        dto.type === StockMovementType.EXIT ||
        dto.type === StockMovementType.ADJUSTMENT
      ) {
        void this.productionOrdersService.autoGenerateForLowStock(
          companyId,
          inventory.productId,
          inventory.warehouseId,
        );
      }

      return movement;
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

      // Custo médio ponderado — só mexe nele numa ENTRADA com custo
      // informado (mesma fórmula de PurchaseService.receive). Sem
      // custo informado, ou em saída/ajuste, o custo médio existente
      // fica como está: saída não muda o custo do que ficou, e ajuste
      // pode tanto subir quanto descer a quantidade, sem um custo de
      // origem claro pra misturar.
      let averageCost: number | undefined;

      switch (dto.type) {
        case StockMovementType.ENTRY:
          if (dto.unitCost !== undefined) {
            const existingQuantity = quantity;
            const existingAverageCost = Number(inventory.averageCost);
            const totalQuantity = existingQuantity + dto.quantity;

            averageCost =
              totalQuantity > 0
                ? (existingQuantity * existingAverageCost +
                    dto.quantity * dto.unitCost) /
                  totalQuantity
                : existingAverageCost;
          }

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
          ...(averageCost !== undefined && { averageCost }),
        },
      });
    }
  }