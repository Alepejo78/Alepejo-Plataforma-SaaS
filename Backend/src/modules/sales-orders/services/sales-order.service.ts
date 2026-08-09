import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  BusinessPartnerRole,
  SalesOrderStatus,
} from '@prisma/client';

import { BusinessPartnersService } from '../../business-partners/services/business-partners.service';

import { PrismaService } from '../../../core/prisma/prisma.service';
import { DocumentSequenceService } from '../../../core/document-sequence/document-sequence.service';

import { SalesOrderRepository } from '../repositories/sales-order.repository';

import { CreateSalesOrderDto } from '../dto/create-sales-order.dto';
import { UpdateSalesOrderDto } from '../dto/update-sales-order.dto';
import { SalesOrderFilterDto } from '../dto/sales-order-filter.dto';

const SEQUENCE_TYPE = 'SALES_ORDER';

@Injectable()
export class SalesOrderService {
  constructor(
    private readonly repository: SalesOrderRepository,
    private readonly prisma: PrismaService,
    private readonly businessPartnersService: BusinessPartnersService,
    private readonly documentSequence: DocumentSequenceService,
  ) {}

  async create(companyId: string, dto: CreateSalesOrderDto) {
    await this.businessPartnersService.assertHasRole(
      companyId,
      dto.partnerId,
      BusinessPartnerRole.CUSTOMER,
    );

    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id: dto.warehouseId, companyId },
    });

    if (!warehouse) {
      throw new NotFoundException(
        'Almoxarifado não encontrado.',
      );
    }

    let totalAmount = 0;

    for (const item of dto.items) {
      const product = await this.prisma.product.findFirst({
        where: { id: item.productId, companyId },
      });

      if (!product) {
        throw new NotFoundException(
          `Produto ${item.productId} não encontrado.`,
        );
      }

      totalAmount += item.quantity * item.unitPrice;
    }

    const netAmount =
      totalAmount -
      (dto.discountValue ?? 0) +
      (dto.freightValue ?? 0) +
      (dto.otherExpenses ?? 0);

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
        dto,
        totalAmount,
        netAmount,
      );
    });
  }

  async findAll(
    companyId: string,
    filter: SalesOrderFilterDto,
  ) {
    return this.repository.findAll(companyId, filter);
  }

  async findOne(companyId: string, id: string) {
    const order = await this.repository.findById(
      companyId,
      id,
    );

    if (!order) {
      throw new NotFoundException(
        'Pedido de venda não encontrado.',
      );
    }

    return order;
  }

  async update(
    companyId: string,
    id: string,
    dto: UpdateSalesOrderDto,
  ) {
    const order = await this.findOne(companyId, id);

    if (order.status !== SalesOrderStatus.DRAFT) {
      throw new BadRequestException(
        'Somente pedidos em rascunho podem ser alterados.',
      );
    }

    if (dto.partnerId) {
      await this.businessPartnersService.assertHasRole(
        companyId,
        dto.partnerId,
        BusinessPartnerRole.CUSTOMER,
      );
    }

    if (dto.warehouseId) {
      const warehouse = await this.prisma.warehouse.findFirst(
        {
          where: { id: dto.warehouseId, companyId },
        },
      );

      if (!warehouse) {
        throw new NotFoundException(
          'Almoxarifado não encontrado.',
        );
      }
    }

    let items:
      | {
          productId: string;
          quantity: number;
          unitPrice: number;
          totalPrice: number;
        }[]
      | undefined;

    let totalAmount = Number(order.totalAmount);

    if (dto.items) {
      totalAmount = 0;

      for (const item of dto.items) {
        const product = await this.prisma.product.findFirst({
          where: { id: item.productId, companyId },
        });

        if (!product) {
          throw new NotFoundException(
            `Produto ${item.productId} não encontrado.`,
          );
        }

        totalAmount += item.quantity * item.unitPrice;
      }

      items = dto.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.quantity * item.unitPrice,
      }));
    }

    const discountValue =
      dto.discountValue ?? Number(order.discountValue);
    const freightValue =
      dto.freightValue ?? Number(order.freightValue);
    const otherExpenses =
      dto.otherExpenses ?? Number(order.otherExpenses);

    const netAmount =
      totalAmount - discountValue + freightValue + otherExpenses;

    return this.repository.update(id, {
      partnerId: dto.partnerId,
      warehouseId: dto.warehouseId,
      orderDate: dto.orderDate
        ? new Date(dto.orderDate)
        : undefined,
      observation: dto.observation,
      discountValue,
      freightValue,
      otherExpenses,
      totalAmount,
      netAmount,
      items,
    });
  }

  async cancel(companyId: string, id: string) {
    const order = await this.findOne(companyId, id);

    if (order.status !== SalesOrderStatus.DRAFT) {
      throw new BadRequestException(
        'Somente pedidos em rascunho podem ser cancelados.',
      );
    }

    return this.repository.cancel(id);
  }
}
