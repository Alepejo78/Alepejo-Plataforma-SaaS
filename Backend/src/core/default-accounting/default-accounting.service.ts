import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

import {
  DEFAULT_CHART_OF_ACCOUNTS,
  DEFAULT_UNIT_CODE,
  DEFAULT_UNIT_DESCRIPTION,
  SYSTEM_EXPENSE_ACCOUNT_CLASSIFICATION,
  SYSTEM_EXPENSE_ACCOUNT_CODE,
  SYSTEM_EXPENSE_ACCOUNT_DESCRIPTION,
  SYSTEM_EXPENSE_PRODUCT_CODE,
  SYSTEM_EXPENSE_PRODUCT_DESCRIPTION,
} from './default-accounting.constants';

/**
 * Cadastros padrão que toda empresa CLIENTE precisa ter pra não
 * nascer em branco — plano de contas de despesa, unidade de medida e
 * o produto/serviço usado no título da própria mensalidade do ERP.
 *
 * Fonte única de verdade, usada em dois pontos que antes duplicavam
 * (ou ignoravam) essa lógica:
 *  - `CompanyOnboardingService` (signup / createAdditional) — cadastro
 *    completo (42 contas / 6 classificações / 1 unidade / 1 produto).
 *  - `BillingService.syncFinancialEntry` — só a conta `01.01.01`, a
 *    unidade e o produto, sob demanda, pra empresas que já existiam
 *    antes desta mudança (não passaram pelo onboarding novo).
 *
 * NÃO usada pela empresa ALEPEJO — o plano de contas dela é outro,
 * povoado uma vez só por `prisma/seed.ts`.
 */
@Injectable()
export class DefaultAccountingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cria (find-or-create, nunca duplica) as 6 classificações, as 42
   * contas de despesa, a unidade `UN - Unidade` e o produto/serviço
   * `0001 - Compra sistema ERP` da empresa `companyId`. Idempotente:
   * chamar de novo numa empresa que já tem tudo não altera nada (por
   * isso serve tanto pro cadastro de empresa nova quanto pro script de
   * acerto das empresas existentes).
   *
   * Roda dentro da própria transação (curta, só estes registros) pra
   * não deixar a empresa com plano de contas pela metade se cair no
   * meio — não abrange o restante do cadastro (plano/perfil/usuário),
   * que continua fora de transação como já era (ver decisão registrada
   * no handoff do desenvolvedor-backend, 31-08-2026).
   */
  async seedDefaultAccounting(companyId: string): Promise<void> {
    await this.prisma.$transaction(
      async (tx) => {
        const classificationIds = new Map<string, string>();

        for (const account of DEFAULT_CHART_OF_ACCOUNTS) {
          let classificationId = classificationIds.get(
            account.classification,
          );

          if (!classificationId) {
            const classification =
              await tx.chartOfAccountClassification.upsert({
                where: {
                  companyId_name: {
                    companyId,
                    name: account.classification,
                  },
                },
                update: {},
                create: {
                  companyId,
                  name: account.classification,
                },
              });

            classificationId = classification.id;
            classificationIds.set(account.classification, classificationId);
          }

          await tx.chartOfAccount.upsert({
            where: {
              companyId_code: { companyId, code: account.code },
            },
            update: {},
            create: {
              companyId,
              code: account.code,
              classificationId,
              description: account.description,
              type: 'DESPESA',
            },
          });
        }

        const unit = await this.ensureDefaultUnit(companyId, tx);
        await this.ensureSystemExpenseProduct(companyId, unit.id, tx);
      },
      // ~51 upserts sequenciais (6 classificações + 42 contas + 1
      // unidade + 1 produto) — o timeout padrão do Prisma (5s) estoura
      // fácil no Railway (erro P2028) e derruba o cadastro inteiro no
      // meio. 30s dá folga de sobra pra essa carga, que é só de escrita
      // simples (upsert por chave única, sem lock cruzado).
      { timeout: 30000, maxWait: 10000 },
    );
  }

  /** `UN - Unidade`, ativa — find-or-create. */
  async ensureDefaultUnit(companyId: string, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).unitOfMeasure.upsert({
      where: {
        companyId_code: { companyId, code: DEFAULT_UNIT_CODE },
      },
      update: {},
      create: {
        companyId,
        code: DEFAULT_UNIT_CODE,
        description: DEFAULT_UNIT_DESCRIPTION,
        active: true,
      },
    });
  }

  /**
   * Conta `01.01.01 · Sistemas · Despesas com sistema ERP` —
   * find-or-create. Usada tanto no cadastro padrão da empresa nova
   * quanto sob demanda pela mensalidade (`BillingService`) em empresas
   * que já existiam antes desta conta virar cadastro padrão.
   */
  async ensureSystemExpenseAccount(
    companyId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;

    const existing = await client.chartOfAccount.findFirst({
      where: { companyId, code: SYSTEM_EXPENSE_ACCOUNT_CODE },
    });

    if (existing) {
      return existing;
    }

    const classification = await client.chartOfAccountClassification.upsert({
      where: {
        companyId_name: {
          companyId,
          name: SYSTEM_EXPENSE_ACCOUNT_CLASSIFICATION,
        },
      },
      update: {},
      create: {
        companyId,
        name: SYSTEM_EXPENSE_ACCOUNT_CLASSIFICATION,
      },
    });

    return client.chartOfAccount.upsert({
      where: {
        companyId_code: {
          companyId,
          code: SYSTEM_EXPENSE_ACCOUNT_CODE,
        },
      },
      update: {},
      create: {
        companyId,
        code: SYSTEM_EXPENSE_ACCOUNT_CODE,
        classificationId: classification.id,
        description: SYSTEM_EXPENSE_ACCOUNT_DESCRIPTION,
        type: 'DESPESA',
      },
    });
  }

  /**
   * Produto/serviço `0001 - Compra sistema ERP` — find-or-create.
   * `unitId` é obrigatório no cadastro de Product; quando o chamador
   * não tiver a unidade padrão à mão, busca/cria ela também.
   */
  async ensureSystemExpenseProduct(
    companyId: string,
    unitId?: string,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;

    const resolvedUnitId =
      unitId ?? (await this.ensureDefaultUnit(companyId, tx)).id;

    return client.product.upsert({
      where: {
        companyId_code: { companyId, code: SYSTEM_EXPENSE_PRODUCT_CODE },
      },
      update: {},
      create: {
        companyId,
        code: SYSTEM_EXPENSE_PRODUCT_CODE,
        description: SYSTEM_EXPENSE_PRODUCT_DESCRIPTION,
        type: 'SERVICE',
        inventoryControl: 'NONE',
        unitId: resolvedUnitId,
        salePrice: 0,
      },
    });
  }
}
