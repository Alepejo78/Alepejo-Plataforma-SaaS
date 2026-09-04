import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { BusinessPartnerRole, FinancialEntryStatus, FinancialEntryType, QuotationStatus } from '@prisma/client';

import { BusinessPartnersService } from '../../business-partners/services/business-partners.service';
import { EmailNotificationsService } from '../../notifications/services/email-notifications.service';
import { WhatsappNotificationsService } from '../../notifications/services/whatsapp-notifications.service';
import { FinancialEntriesService } from '../../financial-entries/services/financial-entries.service';

import { PrismaService } from '../../../core/prisma/prisma.service';
import { attachAuditNames, attachAuditName } from '../../../core/utils/audit-names.util';
import { DocumentSequenceService } from '../../../core/document-sequence/document-sequence.service';
import { buildEmailDocumentSummaryHtml } from '../../../core/utils/email-document-summary.util';

import { QuotationRepository } from '../repositories/quotation.repository';

import { CreateQuotationDto } from '../dto/create-quotation.dto';
import { UpdateQuotationDto } from '../dto/update-quotation.dto';
import { QuotationFilterDto } from '../dto/quotation-filter.dto';
import { CreateQuotationOfferDto } from '../dto/create-quotation-offer.dto';
import { ChooseWinnerDto } from '../dto/choose-winner.dto';

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
    private readonly financialEntriesService: FinancialEntriesService,
  ) {}

  async create(
    companyId: string,
    rootCompanyId: string,
    dto: CreateQuotationDto,
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

    for (const item of dto.items) {
      const product = await this.prisma.product.findFirst({
        where: { id: item.productId, companyId: rootCompanyId },
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
    rootCompanyId: string,
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
          where: { id: dto.warehouseId, companyId: rootCompanyId },
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
          where: { id: item.productId, companyId: rootCompanyId },
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

  async remove(companyId: string, id: string) {
    const quotation = await this.findOne(companyId, id);

    if (quotation.status !== QuotationStatus.CANCELLED) {
      throw new BadRequestException(
        'Somente cotações canceladas podem ser excluídas.',
      );
    }

    await this.prisma.quotation.delete({ where: { id: quotation.id } });
  }

  async addOffer(
    companyId: string,
    rootCompanyId: string,
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
      rootCompanyId,
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
    dto: ChooseWinnerDto = {},
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

    if (dto.generateFinancialEntry) {
      if (!dto.dueDate) {
        throw new BadRequestException(
          'Informe o vencimento do título antecipado.',
        );
      }

      if (!dto.chartOfAccountId) {
        throw new BadRequestException(
          'Informe o tipo de despesa do título antecipado.',
        );
      }
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

      // A cotação não tem campo de tipo de despesa próprio — sugere a
      // do primeiro item que já tiver uma cadastrada no produto, pra
      // não nascer em branco (dá pra trocar depois, editando o pedido).
      // O tipo de despesa escolhido pro título antecipado (quando
      // houver) prevalece sobre a sugestão.
      const suggestedChartOfAccountId =
        dto.chartOfAccountId ??
        (offer.items.find((item) => item.product?.chartOfAccountId)
          ?.product?.chartOfAccountId ??
          undefined);

      const purchaseOrder = await tx.purchaseOrder.create({
        data: {
          companyId,
          number,
          partnerId: offer.partnerId,
          warehouseId: quotation.warehouseId,
          quotationId: quotation.id,
          quotationOfferId: offer.id,
          orderDate: new Date(),
          chartOfAccountId: suggestedChartOfAccountId,
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

      // Título antecipado — fornecedor que exige pagamento adiantado.
      // Vira o título da Compra de verdade sozinho quando ela for
      // recebida (ver PurchaseService.receive), sem duplicar.
      if (dto.generateFinancialEntry) {
        // Nasce com o número do Pedido de Compra como documento — dá
        // pra identificar o título em Contas a Pagar antes mesmo da
        // Compra existir. No recebimento (PurchaseService.receive),
        // esse valor é substituído pelo número da nota fiscal de
        // verdade (ou mantido, se a nota não trouxer número).
        const purchaseOrderDocumentNumber = `PC-${String(number).padStart(6, '0')}`;

        await this.financialEntriesService.createFromDocument(
          tx,
          {
            companyId,
            type: FinancialEntryType.PAYABLE,
            partnerId: offer.partnerId,
            amount: Number(offer.totalAmount),
            issueDate: new Date(),
            dueDate: new Date(dto.dueDate!),
            paymentMethod: dto.paymentMethod ?? offer.paymentMethod,
            chartOfAccountId: dto.chartOfAccountId,
            purchaseOrderId: purchaseOrder.id,
            documentNumber: purchaseOrderDocumentNumber,
            observation: `Pagamento antecipado — Pedido de Compra ${purchaseOrderDocumentNumber}`,
          },
          userId,
        );
      }
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

      const summaryHtml = buildEmailDocumentSummaryHtml({
        items: offer.items.map((item) => ({
          description: item.product?.description ?? item.productId,
          quantity: Number(
            quotation.items.find(
              (qi) => qi.productId === item.productId,
            )?.quantity ?? 0,
          ),
          unitPrice: Number(item.unitPrice),
          totalPrice: Number(item.totalPrice),
        })),
        totals: {
          totalAmount: Number(offer.totalAmount),
        },
      });

      if (offer.partner.email) {
        void this.emailNotifications.send(
          companyId,
          offer.partner.email,
          `Você foi selecionado — Cotação COT-${quotationNumber}`,
          `<p>Olá, ${partnerName},</p>
<p>Sua proposta foi escolhida como vencedora na cotação <strong>COT-${quotationNumber}</strong> de <strong>${companyName}</strong>.</p>
<p>Segue o Pedido de Compra <strong>${orderNumber}</strong> gerado a partir dela.</p>
${summaryHtml}
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
      include: { purchases: true, financialEntries: true },
    });

    if (order && order.purchases.length > 0) {
      throw new BadRequestException(
        'O pedido de compra gerado por esta cotação já virou uma compra — não é possível estornar a escolha.',
      );
    }

    if (
      order?.financialEntries.some(
        (entry) => entry.status === FinancialEntryStatus.PAID,
      )
    ) {
      throw new BadRequestException(
        'O título antecipado gerado por esta cotação já foi baixado — não é possível estornar a escolha.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      if (order) {
        await tx.financialEntry.updateMany({
          where: { purchaseOrderId: order.id, status: FinancialEntryStatus.OPEN },
          data: { status: FinancialEntryStatus.CANCELLED },
        });

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
