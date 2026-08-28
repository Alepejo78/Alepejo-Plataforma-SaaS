import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  InventoryCountStatus,
  StockMovementType,
} from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';
import {
  attachAuditNames,
  attachAuditName,
} from '../../../core/utils/audit-names.util';
import { DocumentSequenceService } from '../../../core/document-sequence/document-sequence.service';

import { InventoryCountRepository } from '../repositories/inventory-count.repository';

import { CreateInventoryCountDto } from '../dto/create-inventory-count.dto';
import { UpdateInventoryCountDto } from '../dto/update-inventory-count.dto';
import { InventoryCountFilterDto } from '../dto/inventory-count-filter.dto';

const SEQUENCE_TYPE = 'INVENTORY_COUNT';

export function formatInventoryCountNumber(n: number) {
  return `INV-${String(n).padStart(6, '0')}`;
}

interface ResolvedItem {
  productId: string;
  systemQuantity: number;
  countedQuantity?: number;
}

@Injectable()
export class InventoryCountService {
  constructor(
    private readonly repository: InventoryCountRepository,
    private readonly prisma: PrismaService,
    private readonly documentSequence: DocumentSequenceService,
  ) {}

  async create(
    companyId: string,
    rootCompanyId: string,
    dto: CreateInventoryCountDto,
    userId: string,
  ) {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id: dto.warehouseId, companyId: rootCompanyId },
    });

    if (!warehouse) {
      throw new NotFoundException(
        'Almoxarifado não encontrado.',
      );
    }

    const items = await this.resolveNewItems(
      companyId,
      rootCompanyId,
      dto.warehouseId,
      dto.items,
    );

    return this.prisma.$transaction(async (tx) => {
      const number = await this.documentSequence.next(
        tx,
        companyId,
        SEQUENCE_TYPE,
      );

      return this.repository.create(
        tx,
        companyId,
        number,
        {
          warehouseId: dto.warehouseId,
          countDate: dto.countDate
            ? new Date(dto.countDate)
            : undefined,
          observation: dto.observation,
          items,
        },
        userId,
      );
    });
  }

  /**
   * Snapshot do saldo do sistema pra cada produto novo entrando na
   * contagem — só de referência na tela, nunca usado no cálculo real
   * do fechamento (ver `finalize`).
   */
  private async resolveNewItems(
    companyId: string,
    rootCompanyId: string,
    warehouseId: string,
    items: { productId: string }[],
  ): Promise<ResolvedItem[]> {
    const resolved: ResolvedItem[] = [];

    for (const item of items) {
      const product = await this.prisma.product.findFirst({
        where: { id: item.productId, companyId: rootCompanyId },
      });

      if (!product) {
        throw new NotFoundException(
          `Produto ${item.productId} não encontrado.`,
        );
      }

      const inventory = await this.prisma.inventory.findFirst({
        where: { companyId, warehouseId, productId: item.productId },
      });

      resolved.push({
        productId: item.productId,
        systemQuantity: Number(inventory?.quantity ?? 0),
      });
    }

    return resolved;
  }

  async findAll(
    companyId: string,
    filter: InventoryCountFilterDto,
  ) {
    const counts = await this.repository.findAll(
      companyId,
      filter,
    );

    return attachAuditNames(this.prisma, counts);
  }

  async findOne(companyId: string, id: string) {
    const count = await this.repository.findById(
      companyId,
      id,
    );

    if (!count) {
      throw new NotFoundException(
        'Contagem de inventário não encontrada.',
      );
    }

    const withReserved = await this.attachReservedQuantities(
      companyId,
      count,
    );

    return attachAuditName(this.prisma, withReserved);
  }

  /**
   * Anexa o saldo reservado atual de cada item, só como referência —
   * `systemQuantity` já é o total físico (reservado incluso, ver
   * calculateAvailableQuantity), não desconta nada.
   */
  private async attachReservedQuantities<
    T extends {
      warehouseId: string;
      items: { productId: string }[];
    },
  >(companyId: string, record: T) {
    if (record.items.length === 0) {
      return record;
    }

    const inventories = await this.prisma.inventory.findMany({
      where: {
        companyId,
        warehouseId: record.warehouseId,
        productId: {
          in: record.items.map((i) => i.productId),
        },
      },
      select: { productId: true, reservedQuantity: true },
    });

    const reservedByProduct = new Map(
      inventories.map((inv) => [
        inv.productId,
        Number(inv.reservedQuantity),
      ]),
    );

    return {
      ...record,
      items: record.items.map((item) => ({
        ...item,
        reservedQuantity:
          reservedByProduct.get(item.productId) ?? 0,
      })),
    };
  }

  async update(
    companyId: string,
    rootCompanyId: string,
    id: string,
    dto: UpdateInventoryCountDto,
    userId: string,
  ) {
    const count = await this.repository.findById(
      companyId,
      id,
    );

    if (!count) {
      throw new NotFoundException(
        'Contagem de inventário não encontrada.',
      );
    }

    if (count.status !== InventoryCountStatus.DRAFT) {
      throw new BadRequestException(
        'Somente contagens em rascunho podem ser alteradas.',
      );
    }

    if (dto.warehouseId) {
      const warehouse = await this.prisma.warehouse.findFirst({
        where: { id: dto.warehouseId, companyId: rootCompanyId },
      });

      if (!warehouse) {
        throw new NotFoundException(
          'Almoxarifado não encontrado.',
        );
      }
    }

    const warehouseId = dto.warehouseId ?? count.warehouseId;

    let items: ResolvedItem[] | undefined;

    if (dto.items) {
      // Preserva o systemQuantity congelado dos itens que já
      // existiam (só atualiza a quantidade contada); só tira um
      // snapshot novo pros produtos que acabaram de entrar agora.
      const existingByProduct = new Map(
        count.items.map((item) => [item.productId, item]),
      );

      items = [];

      for (const item of dto.items) {
        const existing = existingByProduct.get(item.productId);

        if (existing) {
          items.push({
            productId: item.productId,
            systemQuantity: Number(existing.systemQuantity),
            countedQuantity: item.countedQuantity,
          });

          continue;
        }

        const [resolved] = await this.resolveNewItems(
          companyId,
          rootCompanyId,
          warehouseId,
          [{ productId: item.productId }],
        );

        items.push({
          ...resolved,
          countedQuantity: item.countedQuantity,
        });
      }
    }

    return this.repository.update(
      id,
      {
        warehouseId: dto.warehouseId,
        countDate: dto.countDate
          ? new Date(dto.countDate)
          : undefined,
        observation: dto.observation,
        items,
      },
      userId,
    );
  }

  async finalize(companyId: string, id: string, userId: string) {
    const count = await this.repository.findById(
      companyId,
      id,
    );

    if (!count) {
      throw new NotFoundException(
        'Contagem de inventário não encontrada.',
      );
    }

    if (count.status !== InventoryCountStatus.DRAFT) {
      throw new BadRequestException(
        'Somente contagens em rascunho podem ser finalizadas.',
      );
    }

    const pending = count.items.find(
      (item) => item.countedQuantity == null,
    );

    if (pending) {
      throw new BadRequestException(
        'Preencha a quantidade contada de todos os itens antes de finalizar.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      const documentNumber = formatInventoryCountNumber(
        count.number,
      );

      for (const item of count.items) {
        const inventory = await tx.inventory.findFirst({
          where: {
            companyId,
            warehouseId: count.warehouseId,
            productId: item.productId,
          },
        });

        const liveQuantity = Number(inventory?.quantity ?? 0);
        const counted = Number(item.countedQuantity);
        const delta = counted - liveQuantity;

        // Bateu certinho — nada pra ajustar.
        if (Math.abs(delta) < 0.0005) {
          continue;
        }

        let inventoryId: string;

        if (inventory) {
          await tx.inventory.update({
            where: { id: inventory.id },
            data: { quantity: counted },
          });

          inventoryId = inventory.id;
        } else {
          const created = await tx.inventory.create({
            data: {
              companyId,
              warehouseId: count.warehouseId,
              productId: item.productId,
              quantity: counted,
              averageCost: 0,
            },
          });

          inventoryId = created.id;
        }

        await tx.stockMovement.create({
          data: {
            companyId,
            inventoryId,
            type:
              delta > 0
                ? StockMovementType.ENTRY
                : StockMovementType.EXIT,
            quantity: Math.abs(delta),
            observation: count.observation,
            documentNumber,
          },
        });
      }

      await tx.inventoryCount.update({
        where: { id },
        data: {
          status: InventoryCountStatus.FINALIZED,
          finalizedAt: new Date(),
          updatedById: userId,
        },
      });
    });

    return this.findOne(companyId, id);
  }

  async cancel(companyId: string, id: string, userId: string) {
    const count = await this.repository.findById(
      companyId,
      id,
    );

    if (!count) {
      throw new NotFoundException(
        'Contagem de inventário não encontrada.',
      );
    }

    if (count.status !== InventoryCountStatus.DRAFT) {
      throw new BadRequestException(
        'Somente contagens em rascunho podem ser canceladas.',
      );
    }

    return this.repository.cancel(id, userId);
  }

  async remove(companyId: string, id: string) {
    const count = await this.repository.findById(
      companyId,
      id,
    );

    if (!count) {
      throw new NotFoundException(
        'Contagem de inventário não encontrada.',
      );
    }

    if (count.status !== InventoryCountStatus.CANCELLED) {
      throw new BadRequestException(
        'Só contagens canceladas podem ser excluídas.',
      );
    }

    await this.prisma.inventoryCount.delete({ where: { id } });
  }
}
