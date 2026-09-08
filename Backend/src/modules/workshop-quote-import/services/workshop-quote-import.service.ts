import { BadRequestException, Injectable } from '@nestjs/common';

import {
  BusinessPartnerRole,
  FinancialDocumentType,
  FinancialEntryType,
  PersonType,
  ProductType,
  InventoryControl,
} from '@prisma/client';

import { buildAutoInstallments } from '../../../core/utils/installment.util';

import { BusinessPartnersRepository } from '../../business-partners/repositories/business-partners.repository';
import { BusinessPartnersService } from '../../business-partners/services/business-partners.service';
import { ProductsRepository } from '../../products/repositories/products.repository';
import { ProductsService } from '../../products/services/products.service';
import { UnitsOfMeasureRepository } from '../../units-of-measure/repositories/units-of-measure.repository';
import { ChartOfAccountsRepository } from '../../chart-of-accounts/repositories/chart-of-accounts.repository';
import { FinancialEntriesService } from '../../financial-entries/services/financial-entries.service';
import { FinancialEntriesRepository } from '../../financial-entries/repositories/financial-entries.repository';

import { DocumentTextExtractorService } from '../../invoice-import/services/document-text-extractor.service';
import { WorkshopQuotePdfParserService } from './workshop-quote-pdf-parser.service';

import { ConfirmWorkshopQuoteImportDto } from '../dto/confirm-workshop-quote-import.dto';

/// Contas do plano de contas que a Fazam Car já tem cadastradas
/// especificamente pra isso (ver importação em massa do plano de
/// contas desta empresa) — peça e serviço sempre caem nelas, em
/// compra E venda, conforme pedido do usuário (08-09-2026). Uma
/// empresa sem essas contas cadastradas recebe erro claro no
/// `confirm`, não falha silenciosa.
const PART_CHART_ACCOUNT_CODE = '09.01.02';
const SERVICE_CHART_ACCOUNT_CODE = '09.01.01';

@Injectable()
export class WorkshopQuoteImportService {
  constructor(
    private readonly documentTextExtractor: DocumentTextExtractorService,
    private readonly parser: WorkshopQuotePdfParserService,
    private readonly businessPartnersRepository: BusinessPartnersRepository,
    private readonly businessPartnersService: BusinessPartnersService,
    private readonly productsRepository: ProductsRepository,
    private readonly productsService: ProductsService,
    private readonly unitsOfMeasureRepository: UnitsOfMeasureRepository,
    private readonly chartOfAccountsRepository: ChartOfAccountsRepository,
    private readonly financialEntriesService: FinancialEntriesService,
    private readonly financialEntriesRepository: FinancialEntriesRepository,
  ) {}

  async parseFile(
    buffer: Buffer,
    filename: string | undefined,
    mimetype: string | undefined,
    companyId: string,
    rootCompanyId: string,
  ) {
    const rawText = await this.documentTextExtractor.extractRawText(
      buffer,
      mimetype,
      filename,
    );

    const parsed = this.parser.parse(rawText);

    const existingPartner = parsed.partner.document
      ? await this.businessPartnersRepository.findByDocument(
          rootCompanyId,
          parsed.partner.document,
        )
      : null;

    // Aviso na prévia — o bloqueio de verdade (não deixar confirmar)
    // acontece em `confirm()`, checado de novo ali porque o
    // parceiro/documento podem ter sido editados na tela entre o
    // parse e a confirmação.
    const alreadyImported =
      existingPartner && parsed.documentNumber
        ? !!(await this.financialEntriesRepository.findByPartnerAndDocument(
            companyId,
            existingPartner.id,
            parsed.documentNumber,
          ))
        : false;

    if (alreadyImported) {
      parsed.warnings.push(
        `Já existe um título lançado para este cliente com o documento "${parsed.documentNumber}" — confirmar vai ser bloqueado, a menos que troque o número do orçamento.`,
      );
    }

    const items = await Promise.all(
      parsed.items.map(async (item) => {
        const existing = await this.productsRepository.findByCode(
          rootCompanyId,
          item.code,
        );

        return { ...item, existingProductId: existing?.id ?? null };
      }),
    );

    return {
      ...parsed,
      items,
      partner: {
        ...parsed.partner,
        existingPartnerId: existingPartner?.id ?? null,
      },
    };
  }

  async confirm(
    companyId: string,
    rootCompanyId: string,
    dto: ConfirmWorkshopQuoteImportDto,
    userId: string,
  ) {
    const partnerId = await this.resolvePartner(
      rootCompanyId,
      dto.partner,
      userId,
    );

    const alreadyImported =
      await this.financialEntriesRepository.findByPartnerAndDocument(
        companyId,
        partnerId,
        dto.documentNumber,
      );

    if (alreadyImported) {
      throw new BadRequestException(
        `Já existe um título lançado para este cliente com o documento "${dto.documentNumber}" — confira em Contas a Receber antes de importar de novo.`,
      );
    }

    const partAccount = await this.chartOfAccountsRepository.findByCode(
      rootCompanyId,
      PART_CHART_ACCOUNT_CODE,
    );
    const serviceAccount = await this.chartOfAccountsRepository.findByCode(
      rootCompanyId,
      SERVICE_CHART_ACCOUNT_CODE,
    );

    const createdEntries: unknown[] = [];
    const createdProducts: string[] = [];

    for (const item of dto.items) {
      const chartOfAccount =
        item.kind === 'PART' ? partAccount : serviceAccount;

      if (!chartOfAccount) {
        throw new BadRequestException(
          `Conta contábil ${item.kind === 'PART' ? PART_CHART_ACCOUNT_CODE : SERVICE_CHART_ACCOUNT_CODE} não encontrada no plano de contas desta empresa — cadastre-a antes de importar.`,
        );
      }

      const { productId, created } = await this.resolveProduct(
        rootCompanyId,
        item,
        chartOfAccount.id,
        userId,
      );

      if (created) {
        createdProducts.push(item.code);
      }

      const installments = buildAutoInstallments(
        new Date(`${dto.issueDate}T00:00:00Z`),
        dto.termDays,
        dto.installmentsCount,
        item.netValue,
      );

      const entry = await this.financialEntriesService.create(
        companyId,
        rootCompanyId,
        {
          type: FinancialEntryType.RECEIVABLE,
          partnerId,
          chartOfAccountId: chartOfAccount.id,
          productId,
          issueDate: dto.issueDate,
          termDays: dto.termDays,
          paymentMethod: dto.paymentMethod,
          documentNumber: dto.documentNumber,
          documentType: FinancialDocumentType.ORDEM_SERVICO,
          observation: `Importado do orçamento de oficina — ${item.description}`,
          installments: installments.map((i) => ({
            dueDate: i.dueDate.toISOString(),
            amount: i.amount,
          })),
        },
        userId,
      );

      createdEntries.push(entry);
    }

    return {
      partnerId,
      createdProducts,
      entriesCreated: createdEntries.length,
    };
  }

  private async resolvePartner(
    rootCompanyId: string,
    partner: ConfirmWorkshopQuoteImportDto['partner'],
    userId: string,
  ): Promise<string> {
    if (partner.partnerId) {
      return partner.partnerId;
    }

    const document = (partner.document ?? '').replace(/\D/g, '');

    if (!document || !partner.legalName) {
      throw new BadRequestException(
        'Informe CPF/CNPJ e nome do cliente.',
      );
    }

    const existing = await this.businessPartnersRepository.findByDocument(
      rootCompanyId,
      document,
    );

    if (existing) {
      return existing.id;
    }

    const isCpf = document.length === 11;

    const created = await this.businessPartnersService.create(
      rootCompanyId,
      {
        roles: [BusinessPartnerRole.CUSTOMER],
        personType: isCpf ? PersonType.INDIVIDUAL : PersonType.COMPANY,
        document,
        legalName: partner.legalName,
        phone: partner.phone,
        mobile: partner.mobile,
        zipCode: partner.zipCode,
        street: partner.street,
        number: partner.number,
        complement: partner.complement,
        city: partner.city,
        state: partner.state,
      },
      userId,
    );

    return created.id;
  }

  private async resolveProduct(
    rootCompanyId: string,
    item: ConfirmWorkshopQuoteImportDto['items'][number],
    chartOfAccountId: string,
    userId: string,
  ): Promise<{ productId: string; created: boolean }> {
    const existing = await this.productsRepository.findByCode(
      rootCompanyId,
      item.code,
    );

    if (existing) {
      return { productId: existing.id, created: false };
    }

    const unit = await this.findOrCreateUnit(rootCompanyId, item.unit);
    const unitValue =
      item.quantity > 0 ? item.grossValue / item.quantity : item.grossValue;

    const created = await this.productsService.create(
      rootCompanyId,
      {
        code: item.code,
        description: item.description,
        type:
          item.kind === 'PART' ? ProductType.PRODUCT : ProductType.SERVICE,
        inventoryControl: InventoryControl.NONE,
        unitId: unit.id,
        salePrice: Number(unitValue.toFixed(2)),
        chartOfAccountId,
        saleChartOfAccountId: chartOfAccountId,
      },
      userId,
    );

    return { productId: created.id, created: true };
  }

  private async findOrCreateUnit(rootCompanyId: string, code: string) {
    const trimmed = code.trim().toUpperCase().slice(0, 10) || 'UN';
    const existing = await this.unitsOfMeasureRepository.findByCode(
      rootCompanyId,
      trimmed,
    );

    if (existing) {
      return existing;
    }

    return this.unitsOfMeasureRepository.create(rootCompanyId, {
      code: trimmed,
      description: trimmed,
    });
  }
}
