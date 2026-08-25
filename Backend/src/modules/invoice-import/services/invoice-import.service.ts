import { Injectable } from '@nestjs/common';

import {
  BusinessPartnerRole,
  FinancialEntryType,
} from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';

import { BusinessPartnersRepository } from '../../business-partners/repositories/business-partners.repository';
import { BusinessPartnersService } from '../../business-partners/services/business-partners.service';
import { FinancialEntriesService } from '../../financial-entries/services/financial-entries.service';
import { PurchaseService } from '../../purchase/services/purchase.service';
import { SaleService } from '../../sales/services/sale.service';

import { InvoiceXmlParserService } from './invoice-xml-parser.service';
import { InvoicePartnerDto } from '../dto/invoice-partner.dto';
import { ConfirmPurchaseImportDto } from '../dto/confirm-purchase-import.dto';
import { ConfirmSaleImportDto } from '../dto/confirm-sale-import.dto';
import { ConfirmExpenseImportDto } from '../dto/confirm-expense-import.dto';

@Injectable()
export class InvoiceImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly xmlParser: InvoiceXmlParserService,
    private readonly businessPartnersRepository: BusinessPartnersRepository,
    private readonly businessPartnersService: BusinessPartnersService,
    private readonly financialEntriesService: FinancialEntriesService,
    private readonly purchaseService: PurchaseService,
    private readonly saleService: SaleService,
  ) {}

  parseXml(buffer: Buffer) {
    return this.xmlParser.parse(buffer.toString('utf-8'));
  }

  /**
   * Acha o parceiro pelo id informado, ou pelo CPF/CNPJ — criando um
   * novo cadastro se não existir ainda (dados já vieram da nota
   * importada ou foram digitados na mão).
   */
  private async resolvePartner(
    companyId: string,
    dto: InvoicePartnerDto,
    role: BusinessPartnerRole,
    userId: string,
  ) {
    if (dto.partnerId) {
      return dto.partnerId;
    }

    const document = (dto.document ?? '').replace(/\D/g, '');

    const existing =
      await this.businessPartnersRepository.findByDocument(
        companyId,
        document,
      );

    if (existing) {
      return existing.id;
    }

    const created = await this.businessPartnersService.create(
      companyId,
      {
        roles: [role],
        document,
        legalName: dto.legalName as string,
        tradeName: dto.tradeName,
        email: dto.email,
        zipCode: dto.zipCode,
        street: dto.street,
        number: dto.number,
        complement: dto.complement,
        district: dto.district,
        city: dto.city,
        state: dto.state,
      },
      userId,
    );

    return created.id;
  }

  async confirmPurchase(
    companyId: string,
    dto: ConfirmPurchaseImportDto,
    userId: string,
  ) {
    const partnerId = await this.resolvePartner(
      companyId,
      dto.partner,
      BusinessPartnerRole.SUPPLIER,
      userId,
    );

    const purchase = await this.purchaseService.create(
      companyId,
      {
        partnerId,
        warehouseId: dto.warehouseId,
        chartOfAccountId: dto.chartOfAccountId,
        observation: dto.observation,
        termDays: dto.termDays,
        paymentMethod: dto.paymentMethod,
        items: dto.items,
      },
      userId,
    );

    await this.purchaseService.approve(companyId, purchase.id, userId);

    return this.purchaseService.receive(
      companyId,
      purchase.id,
      {
        invoiceNumber: dto.invoiceNumber,
        invoiceKey: dto.invoiceKey,
        invoiceIssueDate: dto.invoiceIssueDate
          ? (dto.invoiceIssueDate as unknown as Date)
          : undefined,
        termDays: dto.termDays,
        paymentMethod: dto.paymentMethod,
        installments: dto.installments,
      },
      userId,
    );
  }

  async confirmSale(
    companyId: string,
    dto: ConfirmSaleImportDto,
    userId: string,
  ) {
    const partnerId = await this.resolvePartner(
      companyId,
      dto.partner,
      BusinessPartnerRole.CUSTOMER,
      userId,
    );

    const sale = await this.saleService.create(
      companyId,
      {
        partnerId,
        warehouseId: dto.warehouseId,
        chartOfAccountId: dto.chartOfAccountId,
        observation: dto.observation,
        termDays: dto.termDays,
        paymentMethod: dto.paymentMethod,
        items: dto.items,
      },
      userId,
    );

    return this.saleService.approve(
      companyId,
      sale.id,
      {
        invoiceNumber: dto.invoiceNumber,
        invoiceKey: dto.invoiceKey,
        invoiceIssueDate: dto.invoiceIssueDate
          ? (dto.invoiceIssueDate as unknown as Date)
          : undefined,
        termDays: dto.termDays,
        paymentMethod: dto.paymentMethod,
        installments: dto.installments,
      },
      userId,
    );
  }

  async confirmPurchaseExpense(
    companyId: string,
    dto: ConfirmExpenseImportDto,
    userId: string,
  ) {
    return this.confirmExpense(
      companyId,
      dto,
      FinancialEntryType.PAYABLE,
      BusinessPartnerRole.SUPPLIER,
      userId,
    );
  }

  async confirmSaleExpense(
    companyId: string,
    dto: ConfirmExpenseImportDto,
    userId: string,
  ) {
    return this.confirmExpense(
      companyId,
      dto,
      FinancialEntryType.RECEIVABLE,
      BusinessPartnerRole.CUSTOMER,
      userId,
    );
  }

  private async confirmExpense(
    companyId: string,
    dto: ConfirmExpenseImportDto,
    type: FinancialEntryType,
    role: BusinessPartnerRole,
    userId: string,
  ) {
    const partnerId = await this.resolvePartner(
      companyId,
      dto.partner,
      role,
      userId,
    );

    return this.prisma.$transaction((tx) =>
      this.financialEntriesService.createInstallments(
        tx,
        {
          companyId,
          type,
          partnerId,
          issueDate: new Date(dto.issueDate),
          chartOfAccountId: dto.chartOfAccountId,
          documentNumber: dto.documentNumber,
          documentKey: dto.documentKey,
          documentType: dto.documentType,
          paymentMethod: dto.paymentMethod,
          observation: dto.observation,
          installments: dto.installments.map((installment) => ({
            dueDate: new Date(installment.dueDate),
            amount: installment.amount,
          })),
        },
        userId,
      ),
    );
  }
}
