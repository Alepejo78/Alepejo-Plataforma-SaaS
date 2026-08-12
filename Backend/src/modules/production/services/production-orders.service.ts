import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { Prisma, StockMovementType } from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';
import { DocumentSequenceService } from '../../../core/document-sequence/document-sequence.service';
import { calculateAvailableQuantity } from '../../../core/utils/inventory.util';
import { LicenseService } from '../../identity/license/services/license.service';

import { ProductionOrderRepository } from '../repositories/production-order.repository';
import { ProductionSettingsRepository } from '../repositories/production-settings.repository';

import { CreateProductionOrderDto } from '../dto/create-production-order.dto';
import { UpdateProductionOrderDto } from '../dto/update-production-order.dto';
import { ProductionOrderFilterDto } from '../dto/production-order-filter.dto';
import { CompleteProductionOrderDto } from '../dto/complete-production-order.dto';

const SEQUENCE_TYPE = 'PRODUCTION_ORDER';

/** Meia-noite UTC do dia — mesmo padrão de "data de calendário" usado no resto do sistema. */
function utcMidnight(date: Date): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
    ),
  );
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);

  result.setUTCDate(result.getUTCDate() + days);

  return result;
}

/**
 * Ordem de produção — módulo genérico (não específico de confecção).
 * Nasce manual, ou sozinha em dois gatilhos best-effort (nunca lançam,
 * nunca travam quem chama — mesmo padrão de
 * EmailNotificationsService/WhatsappNotificationsService):
 * - `autoGenerateForSalesOrderItem`: pedido de venda pedindo mais do
 *   que o saldo disponível no almoxarifado do pedido.
 * - `autoGenerateForLowStock`: saldo de um produto (somado em todos
 *   os almoxarifados) chegando ao mínimo cadastrado
 *   (`Product.minimumStock`).
 */
@Injectable()
export class ProductionOrdersService {
  private readonly logger = new Logger(
    ProductionOrdersService.name,
  );

  constructor(
    private readonly repository: ProductionOrderRepository,
    private readonly settingsRepository: ProductionSettingsRepository,
    private readonly prisma: PrismaService,
    private readonly documentSequence: DocumentSequenceService,
    private readonly licenseService: LicenseService,
  ) {}

  async create(companyId: string, dto: CreateProductionOrderDto) {
    await this.assertProductAndWarehouse(
      companyId,
      dto.productId,
      dto.warehouseId,
    );

    const orderDate = utcMidnight(new Date());
    const expectedDate = addDays(orderDate, dto.productionDays);

    return this.prisma.$transaction(async (tx) => {
      const number = await this.documentSequence.next(
        tx,
        companyId,
        SEQUENCE_TYPE,
      );

      return this.repository.create(tx, companyId, number, {
        productId: dto.productId,
        warehouseId: dto.warehouseId,
        quantity: dto.quantity,
        orderDate,
        productionDays: dto.productionDays,
        expectedDate,
        observation: dto.observation,
        origin: 'MANUAL',
      });
    });
  }

  async findAll(
    companyId: string,
    filter: ProductionOrderFilterDto,
  ) {
    return this.repository.findAll(companyId, filter);
  }

  async findOne(companyId: string, id: string) {
    const order = await this.repository.findById(companyId, id);

    if (!order) {
      throw new NotFoundException(
        'Ordem de produção não encontrada.',
      );
    }

    return order;
  }

  async update(
    companyId: string,
    id: string,
    dto: UpdateProductionOrderDto,
  ) {
    const order = await this.findOne(companyId, id);

    if (order.status !== 'AGUARDANDO_PRODUCAO') {
      throw new BadRequestException(
        'Somente ordens aguardando produção podem ser alteradas.',
      );
    }

    if (dto.productId || dto.warehouseId) {
      await this.assertProductAndWarehouse(
        companyId,
        dto.productId ?? order.productId,
        dto.warehouseId ?? order.warehouseId,
      );
    }

    // Mudar os dias de produção recalcula a previsão a partir da
    // mesma data de abertura — nunca aceita a previsão direto.
    const expectedDate =
      dto.productionDays !== undefined
        ? addDays(order.orderDate, dto.productionDays)
        : undefined;

    return this.repository.update(id, {
      productId: dto.productId,
      warehouseId: dto.warehouseId,
      quantity: dto.quantity,
      productionDays: dto.productionDays,
      expectedDate,
      observation: dto.observation,
    });
  }

  async start(companyId: string, id: string) {
    const order = await this.findOne(companyId, id);

    if (order.status !== 'AGUARDANDO_PRODUCAO') {
      throw new BadRequestException(
        'Somente ordens aguardando produção podem ser iniciadas.',
      );
    }

    return this.repository.start(id);
  }

  async cancel(companyId: string, id: string) {
    const order = await this.findOne(companyId, id);

    if (
      order.status !== 'AGUARDANDO_PRODUCAO' &&
      order.status !== 'EM_PRODUCAO'
    ) {
      throw new BadRequestException(
        'Somente ordens aguardando produção ou em produção podem ser canceladas.',
      );
    }

    return this.repository.cancel(id);
  }

  /**
   * Conclui a ordem e gera a entrada de estoque da quantidade
   * produzida (custo médio ponderado, mesmo cálculo do recebimento
   * de compra — ver PurchaseService.receive).
   */
  async complete(
    companyId: string,
    id: string,
    dto: CompleteProductionOrderDto,
  ) {
    const order = await this.findOne(companyId, id);

    if (order.status !== 'EM_PRODUCAO') {
      throw new BadRequestException(
        'Somente ordens em produção podem ser concluídas.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const inventory = await this.findOrCreateInventory(
        tx,
        companyId,
        order.productId,
        order.warehouseId,
      );

      const product = await tx.product.findUnique({
        where: { id: order.productId },
      });

      const existingQuantity = Number(inventory.quantity);
      const existingAverageCost = Number(
        inventory.averageCost,
      );
      const producedQuantity = Number(order.quantity);

      // Produção não tem nota de compra com preço — entra pelo
      // próprio custo médio do produto (não distorce o custo médio
      // do estoque). Só cai no cadastro (Product.cost) quando ainda
      // não existe nenhum saldo/custo médio anterior pra esse
      // produto+depósito.
      const unitCost =
        existingQuantity > 0
          ? existingAverageCost
          : Number(product?.cost ?? 0);

      const totalQuantity =
        existingQuantity + producedQuantity;

      const newAverageCost =
        totalQuantity > 0
          ? (existingQuantity * existingAverageCost +
              producedQuantity * unitCost) /
            totalQuantity
          : 0;

      await tx.inventory.update({
        where: { id: inventory.id },
        data: {
          quantity: { increment: producedQuantity },
          averageCost: newAverageCost,
        },
      });

      const orderNumber = `OP-${String(order.number).padStart(6, '0')}`;

      await tx.stockMovement.create({
        data: {
          companyId,
          inventoryId: inventory.id,
          type: StockMovementType.ENTRY,
          quantity: producedQuantity,
          unitCost,
          observation: `Entrada Ordem de Produção ${orderNumber}`,
          documentNumber: orderNumber,
        },
      });

      return this.repository.complete(
        id,
        new Date(dto.completedAt),
        dto.observation,
        tx,
      );
    });
  }

  /** Desfaz a conclusão — estorna a entrada de estoque (trava se o saldo já foi usado). */
  async undoComplete(companyId: string, id: string) {
    const order = await this.findOne(companyId, id);

    if (order.status !== 'FINALIZADA') {
      throw new BadRequestException(
        'Somente ordens finalizadas podem ser estornadas.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const inventory = await tx.inventory.findFirst({
        where: {
          companyId,
          productId: order.productId,
          warehouseId: order.warehouseId,
        },
      });

      const producedQuantity = Number(order.quantity);

      if (
        !inventory ||
        Number(inventory.quantity) < producedQuantity
      ) {
        throw new BadRequestException(
          'Não é possível estornar: o saldo produzido por esta ordem já foi usado (vendido/movimentado).',
        );
      }

      await tx.inventory.update({
        where: { id: inventory.id },
        data: { quantity: { decrement: producedQuantity } },
      });

      const orderNumber = `OP-${String(order.number).padStart(6, '0')}`;

      await tx.stockMovement.create({
        data: {
          companyId,
          inventoryId: inventory.id,
          type: StockMovementType.EXIT,
          quantity: producedQuantity,
          observation: `Estorno da conclusão da Ordem de Produção ${orderNumber}`,
          documentNumber: orderNumber,
        },
      });

      return this.repository.undoComplete(id, tx);
    });
  }

  async getSettings(companyId: string) {
    return this.settingsRepository.getOrCreate(companyId);
  }

  async updateSettings(
    companyId: string,
    dto: Parameters<
      ProductionSettingsRepository['upsert']
    >[1],
  ) {
    return this.settingsRepository.upsert(companyId, dto);
  }

  /**
   * Gatilho automático #1: pedido de venda pedindo mais do que o
   * saldo disponível no almoxarifado escolhido. Best-effort — nunca
   * lança, uma falha aqui nunca deve derrubar a criação do pedido.
   */
  async autoGenerateForSalesOrderItem(
    companyId: string,
    params: {
      productId: string;
      warehouseId: string;
      requestedQuantity: number;
      salesOrderId: string;
    },
  ): Promise<void> {
    try {
      if (!(await this.licenseService.hasModule(companyId, 'PRODUCTION'))) {
        return;
      }

      const settings = await this.settingsRepository.getOrCreate(
        companyId,
      );

      if (!settings.autoGenerateOnSalesOrder) {
        return;
      }

      const inventory = await this.prisma.inventory.findFirst({
        where: {
          companyId,
          productId: params.productId,
          warehouseId: params.warehouseId,
        },
      });

      const available = inventory
        ? calculateAvailableQuantity(inventory)
        : 0;

      if (params.requestedQuantity <= available) {
        return;
      }

      const shortfall = params.requestedQuantity - available;

      await this.generateIfNotOpen(companyId, {
        productId: params.productId,
        warehouseId: params.warehouseId,
        shortfall,
        origin: 'SALES_ORDER',
        salesOrderId: params.salesOrderId,
        settings,
      });
    } catch (err) {
      this.logger.error(
        `Falha ao gerar ordem de produção (pedido de venda ${params.salesOrderId}, produto ${params.productId}): ${
          err instanceof Error ? err.message : err
        }`,
      );
    }
  }

  /**
   * Gatilho automático #2: saldo de um produto (somado em todos os
   * almoxarifados) chegando ao mínimo cadastrado. Best-effort — nunca
   * lança, chamar depois de qualquer baixa de estoque real (aprovação
   * de venda, saída manual).
   */
  async autoGenerateForLowStock(
    companyId: string,
    productId: string,
    warehouseId: string,
  ): Promise<void> {
    try {
      if (!(await this.licenseService.hasModule(companyId, 'PRODUCTION'))) {
        return;
      }

      const settings = await this.settingsRepository.getOrCreate(
        companyId,
      );

      if (!settings.autoGenerateOnLowStock) {
        return;
      }

      const product = await this.prisma.product.findFirst({
        where: { id: productId, companyId },
      });

      const minimumStock = Number(
        product?.minimumStock ?? 0,
      );

      if (minimumStock <= 0) {
        return;
      }

      const inventories = await this.prisma.inventory.findMany(
        { where: { companyId, productId } },
      );

      const totalAvailable = inventories.reduce(
        (sum, inv) => sum + calculateAvailableQuantity(inv),
        0,
      );

      if (totalAvailable > minimumStock) {
        return;
      }

      const shortfall = minimumStock - totalAvailable;

      await this.generateIfNotOpen(companyId, {
        productId,
        warehouseId,
        shortfall,
        origin: 'LOW_STOCK',
        settings,
      });
    } catch (err) {
      this.logger.error(
        `Falha ao gerar ordem de produção por estoque mínimo (produto ${productId}): ${
          err instanceof Error ? err.message : err
        }`,
      );
    }
  }

  private async generateIfNotOpen(
    companyId: string,
    params: {
      productId: string;
      warehouseId: string;
      shortfall: number;
      origin: 'SALES_ORDER' | 'LOW_STOCK';
      salesOrderId?: string;
      settings: {
        minBatchSize: Prisma.Decimal | number;
        defaultProductionDays: number;
      };
    },
  ) {
    // Já existe ordem em aberto pra esse produto — não duplica.
    // Simplificação deliberada: não soma/ajusta a quantidade da
    // ordem existente, só evita gerar uma nova em cima.
    const existingOpen = await this.repository.findOpenByProduct(
      companyId,
      params.productId,
    );

    if (existingOpen) {
      return;
    }

    const product = await this.prisma.product.findUnique({
      where: { id: params.productId },
    });

    const minBatch =
      Number(product?.minProductionBatch ?? 0) ||
      Number(params.settings.minBatchSize);

    const quantity = Math.max(params.shortfall, minBatch);

    const orderDate = utcMidnight(new Date());
    const productionDays = params.settings.defaultProductionDays;
    const expectedDate = addDays(orderDate, productionDays);

    await this.prisma.$transaction(async (tx) => {
      const number = await this.documentSequence.next(
        tx,
        companyId,
        SEQUENCE_TYPE,
      );

      return this.repository.create(tx, companyId, number, {
        productId: params.productId,
        warehouseId: params.warehouseId,
        quantity,
        orderDate,
        productionDays,
        expectedDate,
        origin: params.origin,
        salesOrderId: params.salesOrderId,
        observation:
          params.origin === 'SALES_ORDER'
            ? 'Gerada automaticamente — pedido de venda maior que o saldo disponível.'
            : 'Gerada automaticamente — saldo do produto chegou ao mínimo.',
      });
    });
  }

  private async assertProductAndWarehouse(
    companyId: string,
    productId: string,
    warehouseId: string,
  ) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, companyId },
    });

    if (!product) {
      throw new NotFoundException('Produto não encontrado.');
    }

    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id: warehouseId, companyId },
    });

    if (!warehouse) {
      throw new NotFoundException(
        'Almoxarifado não encontrado.',
      );
    }
  }

  private async findOrCreateInventory(
    tx: Prisma.TransactionClient,
    companyId: string,
    productId: string,
    warehouseId: string,
  ) {
    const existing = await tx.inventory.findFirst({
      where: { companyId, productId, warehouseId },
    });

    if (existing) {
      return existing;
    }

    return tx.inventory.create({
      data: {
        companyId,
        productId,
        warehouseId,
        quantity: 0,
        averageCost: 0,
      },
    });
  }
}
