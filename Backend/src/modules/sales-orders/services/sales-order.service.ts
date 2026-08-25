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
import { EmailNotificationsService } from '../../notifications/services/email-notifications.service';
import { WhatsappNotificationsService } from '../../notifications/services/whatsapp-notifications.service';
import { ProductionOrdersService } from '../../production/services/production-orders.service';

import { PrismaService } from '../../../core/prisma/prisma.service';
import { attachAuditNames, attachAuditName } from '../../../core/utils/audit-names.util';
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
    private readonly emailNotifications: EmailNotificationsService,
    private readonly whatsappNotifications: WhatsappNotificationsService,
    private readonly productionOrdersService: ProductionOrdersService,
  ) {}

  async create(
    companyId: string,
    dto: CreateSalesOrderDto,
    userId: string,
  ) {
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

    const order = await this.prisma.$transaction(async (tx) => {
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
        userId,
      );
    });

    void this.notifyPartner(companyId, order);

    // Best-effort: gera ordem de produção sozinha se algum item pedir
    // mais do que o saldo disponível — ver
    // ProductionOrdersService.autoGenerateForSalesOrderItem (só age
    // se a empresa tiver o módulo PRODUCTION licenciado).
    for (const item of order.items) {
      void this.productionOrdersService.autoGenerateForSalesOrderItem(
        companyId,
        {
          productId: item.productId,
          warehouseId: order.warehouseId,
          requestedQuantity: Number(item.quantity),
          salesOrderId: order.id,
        },
      );
    }

    return order;
  }

  /**
   * Best-effort: envia o pedido de venda gerado ao cliente por
   * e-mail/WhatsApp. Nunca lança — ver EmailNotificationsService.send/
   * WhatsappNotificationsService.send.
   */
  private async notifyPartner(
    companyId: string,
    order: Awaited<ReturnType<SalesOrderRepository['create']>>,
  ) {
    const partner = order.partner;

    if (!partner.email && !partner.mobile) {
      return;
    }

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    const companyName =
      company?.tradeName || company?.legalName || 'AlePejo ERP';
    const partnerName = partner.tradeName || partner.legalName;
    const orderNumber = `PV-${String(order.number).padStart(6, '0')}`;
    const value = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Number(order.netAmount));

    if (partner.email) {
      void this.emailNotifications.send(
        companyId,
        partner.email,
        `Pedido de Venda ${orderNumber} — ${companyName}`,
        `<p>Olá, ${partnerName},</p>
<p>Segue nosso Pedido de Venda <strong>${orderNumber}</strong> de <strong>${companyName}</strong>, no valor de <strong>${value}</strong>.</p>
<p>Qualquer dúvida, estamos à disposição.</p>
<p>Atenciosamente,<br/>${companyName}</p>`,
      );
    }

    if (partner.mobile) {
      void this.whatsappNotifications.send(
        companyId,
        partner.mobile,
        `Olá, ${partnerName}! Segue nosso Pedido de Venda ${orderNumber} de ${companyName}, no valor de ${value}. Qualquer dúvida, estamos à disposição.`,
      );
    }
  }

  async findAll(
    companyId: string,
    filter: SalesOrderFilterDto,
  ) {
    const orders = await this.repository.findAll(companyId, filter);

    return attachAuditNames(this.prisma, orders);
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

    return attachAuditName(this.prisma, order);
  }

  async update(
    companyId: string,
    id: string,
    dto: UpdateSalesOrderDto,
    userId: string,
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

    return this.repository.update(
      id,
      {
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
      },
      userId,
    );
  }

  async cancel(companyId: string, id: string, userId: string) {
    const order = await this.findOne(companyId, id);

    if (order.status !== SalesOrderStatus.DRAFT) {
      throw new BadRequestException(
        'Somente pedidos em rascunho podem ser cancelados.',
      );
    }

    return this.repository.cancel(id, userId);
  }
}
