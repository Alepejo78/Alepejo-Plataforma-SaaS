import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../../../core/prisma/prisma.service';
import { DefaultAccountingService } from '../../../../core/default-accounting/default-accounting.service';
import { PLATFORM_COMPANY_CODE } from '../../../../core/constants/platform.constants';

import type { WebsiteLicenseLookup } from './site-web-integration-client.service';

const WEBSITE_EXPENSE_ACCOUNT_CODE = '05.01.02';
const WEBSITE_EXPENSE_ACCOUNT_CLASSIFICATION = 'MARKETING';
const WEBSITE_EXPENSE_ACCOUNT_DESCRIPTION = 'SITE GOOGLE';

interface WebsiteCharge {
  kind: 'setup' | 'monthly';
  amount: number;
  dueDate: string;
  invoiceNumber: string;
}

/**
 * Gera o título de contas a pagar da cobrança do plano Website (aba
 * "Website" de Configurações > Licenciamento) assim que o cliente
 * abre a tela — idempotente pelo número da fatura do Asaas, já que
 * essa cobrança nasce em outro sistema (AlePejoServiços) e não existe
 * FK única pra ela aqui, diferente de `BillingCharge` (mensalidade do
 * próprio ERP, ver `BillingService.syncFinancialEntry`). Sem número de
 * fatura, não cria nada — não dá pra deduplicar com segurança.
 */
@Injectable()
export class WebsiteFinancialEntryService {
  private readonly logger = new Logger(WebsiteFinancialEntryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly defaultAccounting: DefaultAccountingService,
  ) {}

  async sync(companyId: string, lookup: WebsiteLicenseLookup): Promise<void> {
    if (!lookup.found) {
      return;
    }

    const charges: WebsiteCharge[] = [];

    if (lookup.setup && !lookup.setup.paid && lookup.setup.invoiceNumber) {
      charges.push({
        kind: 'setup',
        amount: lookup.setup.amount,
        dueDate: lookup.setup.dueDate ?? new Date().toISOString().slice(0, 10),
        invoiceNumber: lookup.setup.invoiceNumber,
      });
    }

    if (lookup.monthly && lookup.monthly.invoiceNumber) {
      charges.push({
        kind: 'monthly',
        amount: lookup.monthly.amount,
        dueDate: lookup.monthly.dueDate,
        invoiceNumber: lookup.monthly.invoiceNumber,
      });
    }

    for (const charge of charges) {
      try {
        await this.syncOne(companyId, charge);
      } catch (err) {
        this.logger.warn(
          `Falha ao lançar título da fatura ${charge.invoiceNumber} (Website) na empresa ${companyId}: ${err instanceof Error ? err.message : err}`,
        );
      }
    }
  }

  private async syncOne(companyId: string, charge: WebsiteCharge): Promise<void> {
    const existing = await this.prisma.financialEntry.findFirst({
      where: { companyId, type: 'PAYABLE', documentNumber: charge.invoiceNumber },
    });

    if (existing) {
      return;
    }

    const plataforma = await this.prisma.company.findFirst({
      where: { code: PLATFORM_COMPANY_CODE },
      select: { legalName: true, tradeName: true, document: true },
    });

    if (!plataforma) {
      this.logger.warn(
        `Sem empresa ${PLATFORM_COMPANY_CODE} no banco — fatura Website ${charge.invoiceNumber} ficou sem conta a pagar.`,
      );
      return;
    }

    const partner =
      (await this.prisma.businessPartner.findFirst({
        where: { companyId, document: plataforma.document },
      })) ??
      (await this.prisma.businessPartner.create({
        data: {
          companyId,
          legalName: plataforma.legalName,
          tradeName: plataforma.tradeName ?? 'AlePejo',
          document: plataforma.document,
          personType: 'COMPANY',
          roles: ['SUPPLIER'],
        },
      }));

    const chartOfAccount = await this.ensureWebsiteExpenseAccount(companyId);
    const unit = await this.defaultAccounting.ensureDefaultUnit(companyId);
    const product = await this.defaultAccounting.ensureSystemExpenseProduct(
      companyId,
      unit.id,
    );

    await this.prisma.financialEntry.create({
      data: {
        companyId,
        partnerId: partner.id,
        chartOfAccountId: chartOfAccount.id,
        productId: product.id,
        documentNumber: charge.invoiceNumber,
        documentType: 'FATURA',
        type: 'PAYABLE',
        status: 'OPEN',
        issueDate: new Date(),
        dueDate: new Date(charge.dueDate),
        amount: charge.amount,
        observation:
          charge.kind === 'setup'
            ? 'Taxa de implantação — Website'
            : 'Mensalidade — Website',
      },
    });
  }

  /** Conta `05.01.02 · MARKETING · SITE GOOGLE` — find-or-create. */
  private async ensureWebsiteExpenseAccount(companyId: string) {
    const existing = await this.prisma.chartOfAccount.findFirst({
      where: { companyId, code: WEBSITE_EXPENSE_ACCOUNT_CODE },
    });

    if (existing) {
      return existing;
    }

    const classification = await this.prisma.chartOfAccountClassification.upsert({
      where: {
        companyId_name: {
          companyId,
          name: WEBSITE_EXPENSE_ACCOUNT_CLASSIFICATION,
        },
      },
      update: {},
      create: {
        companyId,
        name: WEBSITE_EXPENSE_ACCOUNT_CLASSIFICATION,
      },
    });

    return this.prisma.chartOfAccount.upsert({
      where: {
        companyId_code: {
          companyId,
          code: WEBSITE_EXPENSE_ACCOUNT_CODE,
        },
      },
      update: {},
      create: {
        companyId,
        code: WEBSITE_EXPENSE_ACCOUNT_CODE,
        classificationId: classification.id,
        description: WEBSITE_EXPENSE_ACCOUNT_DESCRIPTION,
        type: 'DESPESA',
      },
    });
  }
}
