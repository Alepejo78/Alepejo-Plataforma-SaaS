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
import { EmailNotificationsService } from '../../notifications/services/email-notifications.service';
import { WhatsappNotificationsService } from '../../notifications/services/whatsapp-notifications.service';

import { PrismaService } from '../../../core/prisma/prisma.service';
import { attachAuditNames, attachAuditName } from '../../../core/utils/audit-names.util';
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
    private readonly emailNotifications: EmailNotificationsService,
    private readonly whatsappNotifications: WhatsappNotificationsService,
  ) {}

  async create(
    companyId: string,
    rootCompanyId: string,
    dto: CreatePurchaseOrderDto,
    userId: string,
  ) {
    await this.businessPartnersService.assertHasRole(
      rootCompanyId,
      dto.partnerId,
      BusinessPartnerRole.SUPPLIER,
    );

    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id: dto.warehouseId, companyId: rootCompanyId },
    });

    if (!warehouse) {
      throw new NotFoundException(
        'Almoxarifado não encontrado.',
      );
    }

    const chartOfAccount = await this.prisma.chartOfAccount.findFirst({
      where: { id: dto.chartOfAccountId, companyId: rootCompanyId },
    });

    if (!chartOfAccount) {
      throw new NotFoundException(
        'Tipo de despesa não encontrado.',
      );
    }

    let totalAmount = 0;

    for (const item of dto.items) {
      const product = await this.prisma.product.findFirst({
        where: { id: item.productId, companyId: rootCompanyId },
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
        userId,
      );
    });

    void this.notifyPartner(companyId, order);

    return order;
  }

  /**
   * Best-effort: avisa o fornecedor por e-mail/WhatsApp que o pedido
   * de compra foi gerado, pedindo pra informar o número na observação
   * da nota fiscal (facilita o rastreamento no recebimento). Nunca
   * lança — ver EmailNotificationsService.send/WhatsappNotificationsService.send.
   */
  private async notifyPartner(
    companyId: string,
    order: Awaited<ReturnType<PurchaseOrderRepository['create']>>,
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
    const orderNumber = `PC-${String(order.number).padStart(6, '0')}`;

    if (partner.email) {
      void this.emailNotifications.send(
        companyId,
        partner.email,
        `Pedido de Compra ${orderNumber} — ${companyName}`,
        `<p>Olá, ${partnerName},</p>
<p>Segue nosso Pedido de Compra <strong>${orderNumber}</strong> de <strong>${companyName}</strong>.</p>
<p>Por favor, informe o número <strong>${orderNumber}</strong> na observação da nota fiscal — isso facilita o rastreamento no recebimento.</p>
<p>Atenciosamente,<br/>${companyName}</p>`,
      );
    }

    if (partner.mobile) {
      void this.whatsappNotifications.send(
        companyId,
        partner.mobile,
        `Olá, ${partnerName}! Segue nosso Pedido de Compra ${orderNumber} de ${companyName}. Por favor, informe esse número (${orderNumber}) na observação da nota fiscal — isso facilita o rastreamento no recebimento.`,
      );
    }
  }

  async findAll(
    companyId: string,
    filter: PurchaseOrderFilterDto,
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
        'Pedido de compra não encontrado.',
      );
    }

    return attachAuditName(this.prisma, order);
  }

  async update(
    companyId: string,
    rootCompanyId: string,
    id: string,
    dto: UpdatePurchaseOrderDto,
    userId: string,
  ) {
    const order = await this.findOne(companyId, id);

    if (order.status !== PurchaseOrderStatus.DRAFT) {
      throw new BadRequestException(
        'Somente pedidos em rascunho podem ser alterados.',
      );
    }

    if (dto.partnerId) {
      await this.businessPartnersService.assertHasRole(
        rootCompanyId,
        dto.partnerId,
        BusinessPartnerRole.SUPPLIER,
      );
    }

    if (dto.warehouseId) {
      const warehouse = await this.prisma.warehouse.findFirst(
        {
          where: { id: dto.warehouseId, companyId: rootCompanyId },
        },
      );

      if (!warehouse) {
        throw new NotFoundException(
          'Almoxarifado não encontrado.',
        );
      }
    }

    if (dto.chartOfAccountId) {
      const chartOfAccount = await this.prisma.chartOfAccount.findFirst(
        {
          where: {
            id: dto.chartOfAccountId,
            companyId: rootCompanyId,
          },
        },
      );

      if (!chartOfAccount) {
        throw new NotFoundException(
          'Tipo de despesa não encontrado.',
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
          where: { id: item.productId, companyId: rootCompanyId },
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

    return this.repository.update(
      id,
      {
        partnerId: dto.partnerId,
        warehouseId: dto.warehouseId,
        orderDate: dto.orderDate
          ? new Date(dto.orderDate)
          : undefined,
        observation: dto.observation,
        totalAmount,
        chartOfAccountId: dto.chartOfAccountId,
        termDays: dto.termDays,
        paymentMethod: dto.paymentMethod,
        installmentsCount: dto.installmentsCount,
        items,
      },
      userId,
    );
  }

  async cancel(companyId: string, id: string, userId: string) {
    const order = await this.findOne(companyId, id);

    if (order.status !== PurchaseOrderStatus.DRAFT) {
      throw new BadRequestException(
        'Somente pedidos em rascunho podem ser cancelados.',
      );
    }

    return this.repository.cancel(id, userId);
  }

  /**
   * Volta um pedido convertido para rascunho — só quando a compra que
   * o converteu não existe mais (foi cancelada e excluída). O vínculo
   * Purchase.purchaseOrderId é único no banco, então enquanto essa
   * compra existir (mesmo cancelada) o pedido fica preso — é o que
   * caracteriza "amarrado em documento posterior".
   */
  async reopen(companyId: string, id: string, userId: string) {
    const order = await this.findOne(companyId, id);

    if (order.status !== PurchaseOrderStatus.CONVERTED) {
      throw new BadRequestException(
        'Somente pedidos convertidos em compra podem ser estornados.',
      );
    }

    const linkedPurchase = await this.prisma.purchase.findFirst({
      where: { purchaseOrderId: id },
    });

    if (linkedPurchase) {
      throw new BadRequestException(
        'Este pedido já tem uma compra vinculada — cancele e exclua a compra antes de estornar o pedido.',
      );
    }

    await this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: PurchaseOrderStatus.DRAFT, updatedById: userId },
    });

    return this.findOne(companyId, id);
  }

  /**
   * Fecha o pedido sem gerar compra nenhuma pra sobra — usado quando
   * o saldo que restou (recebido parcialmente, ex.: fornecedor não vai
   * mais entregar o resto) não vai mais ser convertido.
   */
  async closeBalance(companyId: string, id: string, userId: string) {
    const order = await this.findOne(companyId, id);

    if (
      order.status !== PurchaseOrderStatus.DRAFT &&
      order.status !== PurchaseOrderStatus.PARTIALLY_CONVERTED
    ) {
      throw new BadRequestException(
        'Este pedido não tem saldo em aberto pra zerar.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        // Descarta só o saldo que sobrou — não mexe em
        // convertedQuantity, que é reservado pra compra de verdade.
        // Sem essa distinção, a tela mostraria "convertido" pra
        // quantidade que na real foi só desistida.
        const saldo =
          Number(item.quantity) - Number(item.convertedQuantity);

        if (saldo <= 0) continue;

        await tx.purchaseOrderItem.update({
          where: { id: item.id },
          data: { discardedQuantity: saldo },
        });
      }

      await tx.purchaseOrder.update({
        where: { id },
        data: {
          status: PurchaseOrderStatus.CONVERTED,
          updatedById: userId,
        },
      });
    });

    return this.findOne(companyId, id);
  }
}
