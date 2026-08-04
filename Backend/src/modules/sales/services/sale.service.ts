import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { PrismaService } from '../../../core/prisma/prisma.service';

import { SaleRepository } from '../repositories/sale.repository';

import { CreateSaleDto } from '../dto/create-sale.dto';
import { SaleFilterDto } from '../dto/sale-filter.dto';

@Injectable()
export class SaleService {
  constructor(
    private readonly repository: SaleRepository,
    private readonly prisma: PrismaService,
  ) {}

  async create(
    companyId: string,
    dto: CreateSaleDto,
  ) {
    const client =
      await this.prisma.client.findFirst({
        where: {
          id: dto.clientId,
          companyId,
        },
      });

    if (!client) {
      throw new NotFoundException(
        'Cliente não encontrado.',
      );
    }

    const warehouse =
      await this.prisma.warehouse.findFirst({
        where: {
          id: dto.warehouseId,
          companyId,
        },
      });

    if (!warehouse) {
      throw new NotFoundException(
        'Almoxarifado não encontrado.',
      );
    }

    let totalAmount = 0;

    for (const item of dto.items) {
      const product =
        await this.prisma.product.findFirst({
          where: {
            id: item.productId,
            companyId,
          },
        });

      if (!product) {
        throw new NotFoundException(
          `Produto ${item.productId} não encontrado.`,
        );
      }

      totalAmount +=
        item.quantity * item.unitPrice;
    }

    const netAmount =
      totalAmount -
      (dto.discountValue ?? 0) +
      (dto.freightValue ?? 0) +
      (dto.otherExpenses ?? 0);

    return this.repository.create(
      companyId,
      dto,
      totalAmount,
      netAmount,
    );
  }

  async findAll(
    companyId: string,
    filter: SaleFilterDto,
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
    const sale =
      await this.repository.findById(
        companyId,
        id,
      );

    if (!sale) {
      throw new NotFoundException(
        'Venda não encontrada.',
      );
    }

    return sale;
  }

  async approve(
    companyId: string,
    id: string,
  ) {
    const sale =
      await this.prisma.sale.findFirst({
        where: {
          id,
          companyId,
        },
        include: {
          items: true,
        },
      });

    if (!sale) {
      throw new NotFoundException(
        'Venda não encontrada.',
      );
    }

    if (sale.status !== 'DRAFT') {
      throw new BadRequestException(
        'Somente vendas em elaboração podem ser aprovadas.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      for (const item of sale.items) {
        const inventory =
          await tx.inventory.findFirst({
            where: {
              companyId,
              warehouseId: sale.warehouseId,
              productId: item.productId,
            },
          });

        if (!inventory) {
          throw new BadRequestException(
            `Produto ${item.productId} sem estoque.`,
          );
        }

        const saldo = Number(inventory.quantity);
        const quantidade = Number(item.quantity);

        if (saldo < quantidade) {
          throw new BadRequestException(
            `Estoque insuficiente para o produto ${item.productId}.`,
          );
        }

        await tx.inventory.update({
          where: {
            id: inventory.id,
          },
          data: {
            quantity: saldo - quantidade,
          },
        });

        await tx.stockMovement.create({
          data: {
            companyId,
            inventoryId: inventory.id,
            type: 'EXIT',
            quantity: item.quantity,
            unitCost: inventory.averageCost,
            observation: `Venda ${sale.id}`,
          },
        });
      }

      return tx.sale.update({
        where: {
          id: sale.id,
        },
        data: {
          status: 'APPROVED',
          approvedAt: new Date(),
        },
      });
    });
  }

  async cancelApproval(
    companyId: string,
    id: string,
  ) {
    const sale = await this.prisma.sale.findFirst({
      where: { id, companyId },
      include: { items: true },
    });

    if (!sale) throw new NotFoundException('Venda não encontrada.');

    if (sale.status === 'INVOICED') {
      throw new BadRequestException('Venda faturada não pode ser cancelada.');
    }

    if (sale.status !== 'APPROVED') {
      throw new BadRequestException('Somente vendas aprovadas podem ser canceladas.');
    }

    return this.prisma.$transaction(async (tx) => {
      for (const item of sale.items) {
        const inventory = await tx.inventory.findFirst({
          where: {
            companyId,
            warehouseId: sale.warehouseId,
            productId: item.productId,
          },
        });

        if (!inventory) {
          throw new BadRequestException(`Estoque não encontrado para ${item.productId}.`);
        }

        await tx.inventory.update({
          where: { id: inventory.id },
          data: {
            quantity: Number(inventory.quantity) + Number(item.quantity),
          },
        });

        await tx.stockMovement.create({
          data: {
            companyId,
            inventoryId: inventory.id,
            type: 'ENTRY',
            quantity: item.quantity,
            unitCost: inventory.averageCost,
            observation: `Cancelamento da venda ${sale.id}`,
          },
        });
      }

      return tx.sale.update({
        where: { id: sale.id },
        data: {
          status: 'DRAFT',
          approvedAt: null,
        },
      });
    });
  }

}
