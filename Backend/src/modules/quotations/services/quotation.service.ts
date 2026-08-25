import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { BusinessPartnerRole, QuotationStatus } from '@prisma/client';

import { BusinessPartnersService } from '../../business-partners/services/business-partners.service';
import { EmailNotificationsService } from '../../notifications/services/email-notifications.service';
import { WhatsappNotificationsService } from '../../notifications/services/whatsapp-notifications.service';

import { PrismaService } from '../../../core/prisma/prisma.service';
import { attachAuditNames, attachAuditName } from '../../../core/utils/audit-names.util';
import { DocumentSequenceService } from '../../../core/document-sequence/document-sequence.service';

import { QuotationRepository } from '../repositories/quotation.repository';

import { CreateQuotationDto } from '../dto/create-quotation.dto';
import { UpdateQuotationDto } from '../dto/update-quotation.dto';
import { QuotationFilterDto } from '../dto/quotation-filter.dto';
import { CreateQuotationOfferDto } from '../dto/create-quotation-offer.dto';

const SEQUENCE_TYPE = 'QUOTATION';
const PURCHASE_ORDER_SEQUENCE_TYPE = 'PURCHASE_ORDER';
const MAX_OFFERS = 3;

@Injectable()
export class QuotationService {
  constructor(
    private readonly repository: QuotationRepository,
    private readonly prisma: PrismaService,
    private readonly businessPartnersService: BusinessPartnersService,
    private readonly documentSequence: DocumentSequenceService,
    private readonly emailNotifications: EmailNotificationsService,
    private readonly whatsappNotifications: WhatsappNotificationsService,
  ) {}

  async create(
    companyId: string,
    dto: CreateQuotationDto,
    userId: string,
  ) {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id: dto.warehouseId, companyId },
    });

    if (!warehouse) {
      throw new NotFoundException(
        'Almoxarifado não encontrado.',
      );
    }

    for (const item of dto.items) {
      const product = await this.prisma.product.findFirst({
        where: { id: item.productId, companyId },
      });

      if (!product) {
        throw new NotFoundException(
          `Produto ${item.productId} não encontrado.`,
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const number = await this.documentSequence.next(
        tx,
        companyId,
        SEQUENCE_TYPE,
      );

      return this.repository.create(tx, companyId, number, dto, userId);
    });
  }

  async findAll(companyId: string, filter: QuotationFilterDto) {
    const quotations = await this.repository.findAll(companyId, filter);

    return attachAuditNames(this.prisma, quotations);
  }

  async findOne(companyId: string, id: string) {
    const quotation = await this.repository.findById(
      companyId,
      id,
    );

    if (!quotation) {
      throw new NotFoundException(
        'Cotação não encontrada.',
      );
    }

    return attachAuditName(this.prisma, quotation);
  }

  async update(
    companyId: string,
    id: string,
    dto: UpdateQuotationDto,
    userId: string,
  ) {
    const quotation = await this.findOne(companyId, id);

    if (quotation.status !== QuotationStatus.DRAFT) {
      throw new BadRequestException(
        'Somente cotações em rascunho podem ser alteradas.',
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
      | { productId: string; quantity: number }[]
      | undefined;

    if (dto.items) {
      for (const item of dto.items) {
        const product = await this.prisma.product.findFirst({
          where: { id: item.productId, companyId },
        });

        if (!product) {
          throw new NotFoundException(
            `Produto ${item.productId} não encontrado.`,
          );
        }
      }

      items = dto.items;
    }

    return this.repository.update(
      id,
      {
        warehouseId: dto.warehouseId,
        quotationDate: dto.quotationDate
          ? new Date(dto.quotationDate)
          : undefined,
        observation: dto.observation,
        items,
      },
      userId,
    );
  }

  async cancel(companyId: string, id: string, userId: string) {
    const quotation = await this.findOne(companyId, id);

    if (quotation.status !== QuotationStatus.DRAFT) {
      throw new BadRequestException(
        'Somente cotações em rascunho podem ser canceladas.',
      );
    }

    return this.repository.cancel(id, userId);
  }

  async addOffer(
    companyId: string,
    quotationId: string,
    dto: CreateQuotationOfferDto,
    userId: string,
  ) {
    const quotation = await this.findOne(
      companyId,
      quotationId,
    );

    if (quotation.status !== QuotationStatus.DRAFT) {
      throw new BadRequestException(
        'Esta cotação já foi decidida ou cancelada — não é possível adicionar propostas.',
      );
    }

    if (quotation.offers.length >= MAX_OFFERS) {
      throw new BadRequestException(
        `Esta cotação já tem o máximo de ${MAX_OFFERS} propostas de fornecedor.`,
      );
    }

    if (
      quotation.offers.some(
        (offer) => offer.partnerId === dto.partnerId,
      )
    ) {
      throw new BadRequestException(
        'Este fornecedor já tem uma proposta nesta cotação.',
      );
    }

    await this.businessPartnersService.assertHasRole(
      companyId,
      dto.partnerId,
      BusinessPartnerRole.SUPPLIER,
    );

    const quotationProductIds = new Set(
      quotation.items.map((item) => item.productId),
    );
    const offerProductIds = new Set(
      dto.items.map((item) => item.productId),
    );

    if (
      quotationProductIds.size !== offerProductIds.size ||
      [...quotationProductIds].some(
        (id) => !offerProductIds.has(id),
      )
    ) {
      throw new BadRequestException(
        'A proposta precisa informar o preço de todos os itens da cotação (e só deles).',
      );
    }

    let totalAmount = 0;

    const offerItems = dto.items.map((item) => {
      const quotationItem = quotation.items.find(
        (qi) => qi.productId === item.productId,
      );

      const quantity = Number(quotationItem?.quantity ?? 0);
      const totalPrice = quantity * item.unitPrice;

      totalAmount += totalPrice;

      return {
        productId: item.productId,
        unitPrice: item.unitPrice,
        totalPrice,
      };
    });

    return this.prisma.quotationOffer.create({
      data: {
        quotationId,
        partnerId: dto.partnerId,
        termDays: dto.termDays,
        paymentMethod: dto.paymentMethod,
        installmentsCount: dto.installmentsCount,
        totalAmount,
        createdById: userId,
        items: {
          create: offerItems,
        },
      },
      include: {
        partner: true,
        items: { include: { product: true } },
      },
    });
  }

  async removeOffer(
    companyId: string,
    quotationId: string,
    offerId: string,
  ) {
    const quotation = await this.findOne(
      companyId,
      quotationId,
    );

    if (quotation.status !== QuotationStatus.DRAFT) {
      throw new BadRequestException(
        'Esta cotação já foi decidida ou cancelada.',
      );
    }

    const offer = quotation.offers.find(
      (o) => o.id === offerId,
    );

    if (!offer) {
      throw new NotFoundException(
        'Proposta não encontrada.',
      );
    }

    await this.prisma.quotationOffer.delete({
      where: { id: offerId },
    });
  }

  async chooseWinner(
    companyId: string,
    quotationId: string,
    offerId: string,
    userId: string,
  ) {
    const quotation = await this.findOne(
      companyId,
      quotationId,
    );

    if (quotation.status !== QuotationStatus.DRAFT) {
      throw new BadRequestException(
        'Esta cotação já foi decidida ou cancelada.',
      );
    }

    const offer = quotation.offers.find(
      (o) => o.id === offerId,
    );

    if (!offer) {
      throw new NotFoundException(
        'Proposta não encontrada.',
      );
    }

    let purchaseOrderNumber = 0;

    await this.prisma.$transaction(async (tx) => {
      await tx.quotationOffer.updateMany({
        where: { quotationId },
        data: { isWinner: false },
      });

      await tx.quotationOffer.update({
        where: { id: offerId },
        data: { isWinner: true },
      });

      await tx.quotation.update({
        where: { id: quotationId },
        data: { status: QuotationStatus.DECIDED, updatedById: userId },
      });

      // Escolher o vencedor já gera o pedido de compra com os
      // dados da proposta — não precisa criar na mão depois.
      const number = await this.documentSequence.next(
        tx,
        companyId,
        PURCHASE_ORDER_SEQUENCE_TYPE,
      );

      purchaseOrderNumber = number;

      await tx.purchaseOrder.create({
        data: {
          companyId,
          number,
          partnerId: offer.partnerId,
          warehouseId: quotation.warehouseId,
          quotationId: quotation.id,
          quotationOfferId: offer.id,
          termDays: offer.termDays,
          paymentMethod: offer.paymentMethod,
          installmentsCount: offer.installmentsCount,
          totalAmount: offer.totalAmount,
          createdById: userId,
          updatedById: userId,
          items: {
            create: offer.items.map((item) => ({
              productId: item.productId,
              quantity:
                quotation.items.find(
                  (qi) => qi.productId === item.productId,
                )?.quantity ?? 0,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
            })),
          },
        },
      });
    });

    // Best-effort: avisos por e-mail/WhatsApp nunca devem derrubar a
    // resposta desta rota — ver EmailNotificationsService.send e
    // WhatsappNotificationsService.send.
    if (offer.partner.email || offer.partner.mobile) {
      const company = await this.prisma.company.findUnique({
        where: { id: companyId },
      });

      const companyName =
        company?.tradeName || company?.legalName || 'AlePejo ERP';

      const partnerName =
        offer.partner.tradeName || offer.partner.legalName;

      const quotationNumber = String(
        quotation.number,
      ).padStart(6, '0');
      const orderNumber = `PC-${String(
        purchaseOrderNumber,
      ).padStart(6, '0')}`;

      if (offer.partner.email) {
        void this.emailNotifications.send(
          companyId,
          offer.partner.email,
          `Você foi selecionado — Cotação COT-${quotationNumber}`,
          `<p>Olá, ${partnerName},</p>
<p>Sua proposta foi escolhida como vencedora na cotação <strong>COT-${quotationNumber}</strong> de <strong>${companyName}</strong>.</p>
<p>Segue o Pedido de Compra <strong>${orderNumber}</strong> gerado a partir dela.</p>
<p>Por favor, informe o número <strong>${orderNumber}</strong> na observação da nota fiscal — isso facilita o rastreamento no recebimento.</p>
<p>Atenciosamente,<br/>${companyName}</p>`,
        );
      }

      if (offer.partner.mobile) {
        void this.whatsappNotifications.send(
          companyId,
          offer.partner.mobile,
          `Olá, ${partnerName}! Sua proposta foi escolhida como vencedora na cotação COT-${quotationNumber} de ${companyName}. Segue o Pedido de Compra ${orderNumber} gerado a partir dela. Por favor, informe esse número (${orderNumber}) na observação da nota fiscal — isso facilita o rastreamento no recebimento.`,
        );
      }
    }

    return this.findOne(companyId, quotationId);
  }

  /**
   * Desfaz a escolha da vencedora — volta a cotação pra rascunho pra
   * poder escolher outra proposta. Só permitido se o pedido de compra
   * gerado por chooseWinner ainda não virou uma compra de verdade
   * (senão a decisão está "amarrada" num documento posterior).
   */
  async undoWinner(
    companyId: string,
    quotationId: string,
    userId: string,
  ) {
    const quotation = await this.findOne(companyId, quotationId);

    if (quotation.status !== QuotationStatus.DECIDED) {
      throw new BadRequestException(
        'Somente cotações decididas podem ter a vencedora estornada.',
      );
    }

    const winner = quotation.offers.find((o) => o.isWinner);

    if (!winner) {
      throw new BadRequestException(
        'Esta cotação não tem uma proposta vencedora definida.',
      );
    }

    const order = await this.prisma.purchaseOrder.findFirst({
      where: { quotationOfferId: winner.id },
      include: { purchase: true },
    });

    if (order?.purchase) {
      throw new BadRequestException(
        'O pedido de compra gerado por esta cotação já virou uma compra — não é possível estornar a escolha.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      if (order) {
        await tx.purchaseOrder.delete({ where: { id: order.id } });
      }

      await tx.quotationOffer.update({
        where: { id: winner.id },
        data: { isWinner: false },
      });

      await tx.quotation.update({
        where: { id: quotationId },
        data: { status: QuotationStatus.DRAFT, updatedById: userId },
      });
    });

    return this.findOne(companyId, quotationId);
  }
}
