import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  StockHoldStatus,
  StockHoldType,
  StockMovementType,
} from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';
import { calculateAvailableQuantity } from '../../../core/utils/inventory.util';

import { StockHoldRepository } from '../repositories/stock-hold.repository';

import { CreateStockHoldDto } from '../dto/create-stock-hold.dto';
import { StockHoldFilterDto } from '../dto/stock-hold-filter.dto';

const FIELD_BY_TYPE: Record<StockHoldType, string> = {
  BLOCKED: 'blockedQuantity',
  RESERVED: 'reservedQuantity',
  QUARANTINE: 'quarantineQuantity',
  DAMAGED: 'damagedQuantity',
};

const LABEL_BY_TYPE: Record<StockHoldType, string> = {
  BLOCKED: 'Bloqueio',
  RESERVED: 'Reserva',
  QUARANTINE: 'Quarentena',
  DAMAGED: 'Avaria',
};

@Injectable()
export class StockHoldService {
  constructor(
    private readonly repository: StockHoldRepository,
    private readonly prisma: PrismaService,
  ) {}

  async create(companyId: string, dto: CreateStockHoldDto) {
    const inventory = await this.prisma.inventory.findFirst({
      where: { id: dto.inventoryId, companyId },
    });

    if (!inventory) {
      throw new NotFoundException(
        'Registro de estoque não encontrado.',
      );
    }

    const available = calculateAvailableQuantity(inventory);

    if (dto.quantity > available) {
      throw new BadRequestException(
        `Quantidade indisponível. Saldo disponível para reter: ${available}.`,
      );
    }

    const field = FIELD_BY_TYPE[dto.type];

    return this.prisma.$transaction(async (tx) => {
      const hold = await tx.stockHold.create({
        data: {
          companyId,
          inventoryId: dto.inventoryId,
          type: dto.type,
          quantity: dto.quantity,
          reason: dto.reason,
        },
      });

      await tx.inventory.update({
        where: { id: dto.inventoryId },
        data: {
          [field]: { increment: dto.quantity },
        },
      });

      await tx.stockMovement.create({
        data: {
          companyId,
          inventoryId: dto.inventoryId,
          type: StockMovementType.HOLD,
          quantity: dto.quantity,
          observation: dto.reason
            ? `${LABEL_BY_TYPE[dto.type]}: ${dto.reason}`
            : LABEL_BY_TYPE[dto.type],
        },
      });

      return hold;
    });
  }

  async findAll(companyId: string, filter: StockHoldFilterDto) {
    return this.repository.findAll(companyId, filter);
  }

  async release(companyId: string, id: string) {
    const hold = await this.repository.findById(companyId, id);

    if (!hold) {
      throw new NotFoundException('Retenção não encontrada.');
    }

    if (hold.status !== StockHoldStatus.ACTIVE) {
      throw new BadRequestException(
        'Esta retenção já foi liberada.',
      );
    }

    const field = FIELD_BY_TYPE[hold.type];

    return this.prisma.$transaction(async (tx) => {
      const released = await tx.stockHold.update({
        where: { id },
        data: {
          status: StockHoldStatus.RELEASED,
          releasedAt: new Date(),
        },
      });

      await tx.inventory.update({
        where: { id: hold.inventoryId },
        data: {
          [field]: { decrement: hold.quantity },
        },
      });

      await tx.stockMovement.create({
        data: {
          companyId,
          inventoryId: hold.inventoryId,
          type: StockMovementType.RELEASE,
          quantity: Number(hold.quantity),
          observation: hold.reason
            ? `Liberação de ${LABEL_BY_TYPE[hold.type]}: ${hold.reason}`
            : `Liberação de ${LABEL_BY_TYPE[hold.type]}`,
        },
      });

      return released;
    });
  }
}
