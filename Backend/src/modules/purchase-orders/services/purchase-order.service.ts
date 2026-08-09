import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  BusinessPartnerRole,
  PurchaseOrderStatus,
} from '@prisma/client';

import { BusinessPartnersService } from '../../business-partners/services/business-partners.service';

import { PrismaService } from '../../../core/prisma/prisma.service';
import { DocumentSequenceService } from '../../../core/document-sequence/document-sequence.service';

import { PurchaseOrderRepository } from '../repositories/purchase-order.repository';

import { CreatePurchaseOrderDto } from '../dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from '../dto/update-purchase-order.dto';
import { PurchaseOrderFilterDto } from '../dto/purchase-order-filter.dto';

const SEQUENCE_TYPE = 'PURCHASE_ORDER';

@Injectable()
export class PurchaseOrderService {
  constructor(
    private readonly repository: PurchaseOrderRepository,
    private readonly prisma: PrismaService,
    private readonly businessPartnersService: BusinessPartnersService,
    private readonly documentSequence: DocumentSequenceService,
  ) {}

  async create(companyId: string, dto: CreatePurchaseOrderDto) {
    await this.businessPartnersService.assertHasRole(
      companyId,
      dto.partnerId,
      BusinessPartnerRole.SUPPLIER,
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

    if (dto.quotationOfferId) {
      const offer = await this.prisma.quotationOffer.findFirst(
        {
          where: {
            id: dto.quotationOfferId,
            quotation: { companyId },
          },
        },
      );

      if (!offer) {
        throw new NotFoundException(
          'Proposta de cotação não encontrada.',
        );
      }

      if (!offer.isWinner) {
        throw new BadRequestException(
          'Só a proposta vencedora da cotação pode virar pedido de compra.',
        );
      }
    }

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
      );
    });
  }

  async findAll(
    companyId: string,
    filter: PurchaseOrderFilterDto,
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
        'Pedido de compra não encontrado.',
      );
    }

    return order;
  }

  async update(
    companyId: string,
    id: string,
    dto: UpdatePurchaseOrderDto,
  ) {
    const order = await this.findOne(companyId, id);

    if (order.status !== PurchaseOrderStatus.DRAFT) {
      throw new BadRequestException(
        'Somente pedidos em rascunho podem ser alterados.',
      );
    }

    if (dto.partnerId) {
      await this.businessPartnersService.assertHasRole(
        companyId,
        dto.partnerId,
        BusinessPartnerRole.SUPPLIER,
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

    return this.repository.update(id, {
      partnerId: dto.partnerId,
      warehouseId: dto.warehouseId,
      orderDate: dto.orderDate
        ? new Date(dto.orderDate)
        : undefined,
      observation: dto.observation,
      totalAmount,
      items,
    });
  }

  async cancel(companyId: string, id: string) {
    const order = await this.findOne(companyId, id);

    if (order.status !== PurchaseOrderStatus.DRAFT) {
      throw new BadRequestException(
        'Somente pedidos em rascunho podem ser cancelados.',
      );
    }

    return this.repository.cancel(id);
  }
}
