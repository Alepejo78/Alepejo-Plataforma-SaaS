import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  InventoryCountItemStatus,
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
import { CountItemDto } from '../dto/count-item.dto';
import { FinalizeInventoryCountDto } from '../dto/finalize-inventory-count.dto';
import { UpdateItemReadingsDto } from '../dto/update-item-readings.dto';

const SEQUENCE_TYPE = 'INVENTORY_COUNT';

const OPEN_FOR_READING: InventoryCountStatus[] = [
  InventoryCountStatus.OPEN,
  InventoryCountStatus.COUNTING,
];

export function formatInventoryCountNumber(n: number) {
  return `INV-${String(n).padStart(6, '0')}`;
}

interface ResolvedItem {
  productId: string;
  systemQuantity: number;
}

interface ItemRounds {
  systemQuantity: unknown;
  countedQuantity1: unknown;
  countedQuantity2: unknown;
  countedQuantity3: unknown;
}

const eq = (a: number, b: number) => Math.abs(a - b) < 0.0005;

/**
 * Decide se o item precisa de mais uma rodada de contagem ou já está
 * resolvido. Compara sempre contra o `systemQuantity` congelado na
 * abertura (o que a tela mostra o tempo todo) — o ajuste de estoque de
 * verdade (`adjust()`) recalcula contra o saldo atual real.
 */
export function deriveItemStatus(
  item: ItemRounds,
): InventoryCountItemStatus {
  const sys = Number(item.systemQuantity);

  if (item.countedQuantity1 == null) {
    return InventoryCountItemStatus.PENDING;
  }

  if (eq(Number(item.countedQuantity1), sys)) {
    return InventoryCountItemStatus.DONE;
  }

  if (item.countedQuantity2 == null) {
    return InventoryCountItemStatus.RECOUNT_2;
  }

  if (eq(Number(item.countedQuantity2), sys)) {
    return InventoryCountItemStatus.DONE;
  }

  if (eq(Number(item.countedQuantity2), Number(item.countedQuantity1))) {
    return InventoryCountItemStatus.DONE;
  }

  if (item.countedQuantity3 == null) {
    return InventoryCountItemStatus.RECOUNT_3;
  }

  return InventoryCountItemStatus.DONE;
}

/** Valor final pra ajuste de estoque: a última rodada que existir. */
export function resolveFinalQuantity(item: ItemRounds): number {
  if (item.countedQuantity3 != null) {
    return Number(item.countedQuantity3);
  }

  if (item.countedQuantity2 != null) {
    return Number(item.countedQuantity2);
  }

  if (item.countedQuantity1 != null) {
    return Number(item.countedQuantity1);
  }

  return 0;
}

function nextRoundField(
  item: ItemRounds,
): 'countedQuantity1' | 'countedQuantity2' | 'countedQuantity3' {
  if (item.countedQuantity1 == null) {
    return 'countedQuantity1';
  }

  if (item.countedQuantity2 == null) {
    return 'countedQuantity2';
  }

  return 'countedQuantity3';
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
   * contagem — é contra ele que cada rodada de contagem é comparada.
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

    const withCountedBy =
      await this.attachCountedByNames(withReserved);

    return attachAuditName(this.prisma, withCountedBy);
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

  /** Nome de quem fez cada rodada — resolvido num lote só. */
  private async attachCountedByNames<
    T extends {
      items: {
        countedById1: string | null;
        countedById2: string | null;
        countedById3: string | null;
      }[];
    },
  >(record: T) {
    const ids = new Set<string>();

    for (const item of record.items) {
      if (item.countedById1) ids.add(item.countedById1);
      if (item.countedById2) ids.add(item.countedById2);
      if (item.countedById3) ids.add(item.countedById3);
    }

    if (ids.size === 0) {
      return {
        ...record,
        items: record.items.map((item) => ({
          ...item,
          countedByName1: null,
          countedByName2: null,
          countedByName3: null,
        })),
      };
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: [...ids] } },
      select: { id: true, name: true },
    });

    const nameById = new Map(users.map((u) => [u.id, u.name]));

    return {
      ...record,
      items: record.items.map((item) => ({
        ...item,
        countedByName1: item.countedById1
          ? (nameById.get(item.countedById1) ?? null)
          : null,
        countedByName2: item.countedById2
          ? (nameById.get(item.countedById2) ?? null)
          : null,
        countedByName3: item.countedById3
          ? (nameById.get(item.countedById3) ?? null)
          : null,
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

    if (count.status !== InventoryCountStatus.OPEN) {
      throw new BadRequestException(
        'Somente contagens abertas podem ser alteradas.',
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

    const items = dto.items
      ? await this.resolveNewItems(
          companyId,
          rootCompanyId,
          warehouseId,
          dto.items,
        )
      : undefined;

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

  async count(
    companyId: string,
    rootCompanyId: string,
    id: string,
    dto: CountItemDto,
    userId: string,
  ) {
    const inventoryCount = await this.repository.findById(
      companyId,
      id,
    );

    if (!inventoryCount) {
      throw new NotFoundException(
        'Contagem de inventário não encontrada.',
      );
    }

    if (!OPEN_FOR_READING.includes(inventoryCount.status)) {
      throw new BadRequestException(
        'Esta contagem não está mais aberta pra leitura.',
      );
    }

    let product = await this.prisma.product.findFirst({
      where: { companyId: rootCompanyId, barcode: dto.code },
    });

    if (!product) {
      product = await this.prisma.product.findFirst({
        where: { companyId: rootCompanyId, code: dto.code },
      });
    }

    if (!product) {
      throw new NotFoundException('Produto não encontrado.');
    }

    let item:
      | Omit<(typeof inventoryCount.items)[number], 'product'>
      | undefined = inventoryCount.items.find(
      (i) => i.productId === product.id,
    );

    if (!item) {
      if (!dto.confirmAdd) {
        // Mensagem reconhecida ao pé da letra pelo frontend pra
        // mostrar a confirmação "Deseja incluí-lo?" (o filtro global
        // de exceções só repassa `message`, então não dá pra mandar
        // um código estruturado junto).
        throw new BadRequestException(
          'Item não consta no inventário.',
        );
      }

      item = await this.prisma.inventoryCountItem.create({
        data: {
          inventoryCountId: id,
          productId: product.id,
          systemQuantity: 0,
          addedDuringCount: true,
        },
      });
    }

    if (item.status === InventoryCountItemStatus.DONE) {
      throw new BadRequestException('Este item já foi contado.');
    }

    const field = nextRoundField(item);
    const byField = (
      { countedQuantity1: 'countedById1', countedQuantity2: 'countedById2', countedQuantity3: 'countedById3' } as const
    )[field];

    const status = deriveItemStatus({
      ...item,
      [field]: dto.quantity,
    });

    await this.prisma.inventoryCountItem.update({
      where: { id: item.id },
      data: {
        [field]: dto.quantity,
        [byField]: userId,
        status,
      },
    });

    if (inventoryCount.status === InventoryCountStatus.OPEN) {
      await this.prisma.inventoryCount.update({
        where: { id },
        data: {
          status: InventoryCountStatus.COUNTING,
          updatedById: userId,
        },
      });
    }

    return this.findOne(companyId, id);
  }

  async updateItemReadings(
    companyId: string,
    id: string,
    itemId: string,
    dto: UpdateItemReadingsDto,
    userId: string,
  ) {
    const inventoryCount = await this.repository.findById(
      companyId,
      id,
    );

    if (!inventoryCount) {
      throw new NotFoundException(
        'Contagem de inventário não encontrada.',
      );
    }

    if (
      inventoryCount.status === InventoryCountStatus.ADJUSTED ||
      inventoryCount.status === InventoryCountStatus.CANCELLED
    ) {
      throw new BadRequestException(
        'Esta contagem não aceita mais edição de leituras.',
      );
    }

    const item = inventoryCount.items.find((i) => i.id === itemId);

    if (!item) {
      throw new NotFoundException(
        'Item não encontrado nesta contagem.',
      );
    }

    const data: Record<string, unknown> = {};

    if (dto.countedQuantity1 !== undefined) {
      data.countedQuantity1 = dto.countedQuantity1;
      data.countedById1 = userId;
    }

    if (dto.countedQuantity2 !== undefined) {
      data.countedQuantity2 = dto.countedQuantity2;
      data.countedById2 = userId;
    }

    if (dto.countedQuantity3 !== undefined) {
      data.countedQuantity3 = dto.countedQuantity3;
      data.countedById3 = userId;
    }

    data.status = deriveItemStatus({ ...item, ...data });

    await this.prisma.inventoryCountItem.update({
      where: { id: itemId },
      data,
    });

    if (inventoryCount.status === InventoryCountStatus.OPEN) {
      await this.prisma.inventoryCount.update({
        where: { id },
        data: {
          status: InventoryCountStatus.COUNTING,
          updatedById: userId,
        },
      });
    }

    return this.findOne(companyId, id);
  }

  async finalize(
    companyId: string,
    id: string,
    dto: FinalizeInventoryCountDto,
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

    if (!OPEN_FOR_READING.includes(count.status)) {
      throw new BadRequestException(
        'Somente contagens abertas ou em contagem podem ser finalizadas.',
      );
    }

    const incomplete = count.items.filter(
      (i) =>
        i.status === InventoryCountItemStatus.RECOUNT_2 ||
        i.status === InventoryCountItemStatus.RECOUNT_3,
    );

    if (incomplete.length > 0 && !dto.confirmIncomplete) {
      throw new BadRequestException(
        `Existem ${incomplete.length} item(ns) sem recontagem concluída. Confirma o ajuste mesmo assim?`,
      );
    }

    await this.prisma.inventoryCount.update({
      where: { id },
      data: {
        status: InventoryCountStatus.FINALIZED,
        finalizedAt: new Date(),
        updatedById: userId,
      },
    });

    return this.findOne(companyId, id);
  }

  async adjust(companyId: string, id: string, userId: string) {
    const count = await this.repository.findById(
      companyId,
      id,
    );

    if (!count) {
      throw new NotFoundException(
        'Contagem de inventário não encontrada.',
      );
    }

    if (count.status !== InventoryCountStatus.FINALIZED) {
      throw new BadRequestException(
        'Somente contagens finalizadas podem ser ajustadas.',
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
        const finalQuantity = resolveFinalQuantity(item);
        const delta = finalQuantity - liveQuantity;

        // Bateu certinho — nada pra ajustar.
        if (Math.abs(delta) < 0.0005) {
          continue;
        }

        let inventoryId: string;

        if (inventory) {
          await tx.inventory.update({
            where: { id: inventory.id },
            data: { quantity: finalQuantity },
          });

          inventoryId = inventory.id;
        } else {
          const created = await tx.inventory.create({
            data: {
              companyId,
              warehouseId: count.warehouseId,
              productId: item.productId,
              quantity: finalQuantity,
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
          status: InventoryCountStatus.ADJUSTED,
          adjustedAt: new Date(),
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

    const cancelable: InventoryCountStatus[] = [
      InventoryCountStatus.OPEN,
      InventoryCountStatus.COUNTING,
      InventoryCountStatus.FINALIZED,
    ];

    if (!cancelable.includes(count.status)) {
      throw new BadRequestException(
        'Somente contagens abertas, em contagem ou finalizadas podem ser canceladas.',
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
