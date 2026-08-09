import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { BusinessPartnerRole, QuotationStatus } from '@prisma/client';

import { BusinessPartnersService } from '../../business-partners/services/business-partners.service';

import { PrismaService } from '../../../core/prisma/prisma.service';
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
  ) {}

  async create(companyId: string, dto: CreateQuotationDto) {
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

      return this.repository.create(tx, companyId, number, dto);
    });
  }

  async findAll(companyId: string, filter: QuotationFilterDto) {
    return this.repository.findAll(companyId, filter);
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

    return quotation;
  }

  async update(
    companyId: string,
    id: string,
    dto: UpdateQuotationDto,
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

    return this.repository.update(id, {
      warehouseId: dto.warehouseId,
      quotationDate: dto.quotationDate
        ? new Date(dto.quotationDate)
        : undefined,
      observation: dto.observation,
      items,
    });
  }

  async cancel(companyId: string, id: string) {
    const quotation = await this.findOne(companyId, id);

    if (quotation.status !== QuotationStatus.DRAFT) {
      throw new BadRequestException(
        'Somente cotações em rascunho podem ser canceladas.',
      );
    }

    return this.repository.cancel(id);
  }

  async addOffer(
    companyId: string,
    quotationId: string,
    dto: CreateQuotationOfferDto,
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
        totalAmount,
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
        data: { status: QuotationStatus.DECIDED },
      });

      // Escolher o vencedor já gera o pedido de compra com os
      // dados da proposta — não precisa criar na mão depois.
      const number = await this.documentSequence.next(
        tx,
        companyId,
        PURCHASE_ORDER_SEQUENCE_TYPE,
      );

      await tx.purchaseOrder.create({
        data: {
          companyId,
          number,
          partnerId: offer.partnerId,
          warehouseId: quotation.warehouseId,
          quotationId: quotation.id,
          quotationOfferId: offer.id,
          totalAmount: offer.totalAmount,
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

    return this.findOne(companyId, quotationId);
  }
}
