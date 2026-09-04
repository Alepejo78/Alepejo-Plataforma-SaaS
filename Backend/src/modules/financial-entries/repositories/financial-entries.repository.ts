import { Injectable } from '@nestjs/common';
import {
  FinancialEntry,
  FinancialEntryStatus,
  FinancialEntryType,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';

import { FinancialEntryFilterDto } from '../dto/financial-entry-filter.dto';

const includeRelations = {
  partner: true,
  employee: true,
  product: true,
  bankAccount: true,
  chartOfAccount: {
    include: { classification: true },
  },
} satisfies Prisma.FinancialEntryInclude;

@Injectable()
export class FinancialEntriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    companyId: string,
    data: Prisma.FinancialEntryUncheckedCreateInput,
  ): Promise<FinancialEntry> {
    return this.prisma.financialEntry.create({
      data: { ...data, companyId },
      include: includeRelations,
    });
  }

  async findById(companyId: string, id: string) {
    return this.prisma.financialEntry.findFirst({
      where: { id, companyId },
      include: includeRelations,
    });
  }

  /** Usado pela importação de planilha pra decidir criar x atualizar — título nunca teve chave de dedupe antes disso. */
  async findByPartnerAndDocument(
    companyId: string,
    partnerId: string,
    documentNumber: string,
  ): Promise<FinancialEntry | null> {
    return this.prisma.financialEntry.findFirst({
      where: { companyId, partnerId, documentNumber },
    });
  }

  async findAll(
    companyId: string,
    filter: FinancialEntryFilterDto,
  ) {
    const {
      type,
      status,
      partnerId,
      employeeId,
      search,
      dueFrom,
      dueTo,
      overdue,
      page,
      limit,
      orderBy,
      order,
    } = filter;

    const where: Prisma.FinancialEntryWhereInput = {
      companyId,

      ...(type && { type }),
      ...(status && { status }),
      ...(partnerId && { partnerId }),
      ...(employeeId && { employeeId }),

      ...((dueFrom || dueTo) && {
        dueDate: {
          ...(dueFrom && { gte: new Date(dueFrom) }),
          ...(dueTo && { lte: new Date(dueTo) }),
        },
      }),

      // Vencidos = em aberto com vencimento anterior a hoje.
      ...(overdue === 'true' && {
        status: FinancialEntryStatus.OPEN,
        dueDate: { lt: new Date() },
      }),

      ...(search && {
        OR: [
          {
            documentNumber: {
              contains: search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            observation: {
              contains: search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            partner: {
              OR: [
                {
                  legalName: {
                    contains: search,
                    mode: Prisma.QueryMode.insensitive,
                  },
                },
                {
                  tradeName: {
                    contains: search,
                    mode: Prisma.QueryMode.insensitive,
                  },
                },
                {
                  document: {
                    contains: search,
                    mode: Prisma.QueryMode.insensitive,
                  },
                },
              ],
            },
          },
          {
            employee: {
              name: {
                contains: search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
          },
        ],
      }),
    };

    const [data, total, totals] = await this.prisma.$transaction([
      this.prisma.financialEntry.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [orderBy]: order },
        include: includeRelations,
      }),

      this.prisma.financialEntry.count({ where }),

      this.prisma.financialEntry.groupBy({
        by: ['status'],
        where,
        orderBy: { status: 'asc' },
        _sum: { amount: true, paidAmount: true },
      }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      totals,
    };
  }

  /** Títulos do ano (não cancelados) para montar o fluxo de caixa mensal. */
  /**
   * Títulos do ano agrupáveis por tipo de despesa/receita. Traz a conta
   * junto (`chartOfAccount`) porque o gráfico mostra a descrição dela,
   * não o id.
   */
  /** `companyId` aceita array — mesmo motivo do `findForCashFlow`. */
  async findForAccountBreakdown(
    companyId: string | string[],
    year: number,
    type: FinancialEntryType,
  ) {
    const yearStart = new Date(Date.UTC(year, 0, 1));
    const yearEnd = new Date(Date.UTC(year + 1, 0, 1));

    return this.prisma.financialEntry.findMany({
      where: {
        companyId: Array.isArray(companyId)
          ? { in: companyId }
          : companyId,
        type,
        status: { not: FinancialEntryStatus.CANCELLED },
        OR: [
          { dueDate: { gte: yearStart, lt: yearEnd } },
          { paymentDate: { gte: yearStart, lt: yearEnd } },
        ],
      },
      select: {
        status: true,
        amount: true,
        paidAmount: true,
        chartOfAccount: {
          select: { id: true, code: true, description: true },
        },
      },
    });
  }

  /** Mesmo recorte de `findForAccountBreakdown`, só que traz a forma de pagamento em vez do plano de contas. */
  async findForPaymentMethodBreakdown(
    companyId: string | string[],
    year: number,
    type: FinancialEntryType,
  ) {
    const yearStart = new Date(Date.UTC(year, 0, 1));
    const yearEnd = new Date(Date.UTC(year + 1, 0, 1));

    return this.prisma.financialEntry.findMany({
      where: {
        companyId: Array.isArray(companyId)
          ? { in: companyId }
          : companyId,
        type,
        status: { not: FinancialEntryStatus.CANCELLED },
        OR: [
          { dueDate: { gte: yearStart, lt: yearEnd } },
          { paymentDate: { gte: yearStart, lt: yearEnd } },
        ],
      },
      select: {
        status: true,
        amount: true,
        paidAmount: true,
        paymentMethod: true,
      },
    });
  }

  /**
   * `companyId` aceita um array pro dashboard consolidado do
   * administrador (soma o fluxo de caixa de todas as empresas do
   * grupo numa consulta só, em vez de uma por empresa).
   */
  async findForCashFlow(
    companyId: string | string[],
    year: number,
  ) {
    const yearStart = new Date(Date.UTC(year, 0, 1));
    const yearEnd = new Date(Date.UTC(year + 1, 0, 1));

    return this.prisma.financialEntry.findMany({
      where: {
        companyId: Array.isArray(companyId)
          ? { in: companyId }
          : companyId,
        status: { not: FinancialEntryStatus.CANCELLED },
        // Uma baixa antecipada pode cair num mês diferente do
        // vencimento — busca por vencimento OU data de pagamento
        // dentro do ano, o service decide em qual balde cada valor
        // entra (ver FinancialEntriesService.getCashFlow).
        OR: [
          { dueDate: { gte: yearStart, lt: yearEnd } },
          { paymentDate: { gte: yearStart, lt: yearEnd } },
        ],
      },
      select: {
        type: true,
        status: true,
        amount: true,
        paidAmount: true,
        dueDate: true,
        paymentDate: true,
      },
    });
  }

  /**
   * Mesma ideia de `findForCashFlow`, só que num intervalo arbitrário
   * (dia/semana/mês) em vez do ano inteiro — usado pela tela de
   * acompanhamento de fluxo de caixa por período
   * (`FinancialEntriesService.getPeriodSummary`).
   */
  async findForPeriodSummary(
    companyId: string | string[],
    start: Date,
    end: Date,
  ) {
    return this.prisma.financialEntry.findMany({
      where: {
        companyId: Array.isArray(companyId)
          ? { in: companyId }
          : companyId,
        status: { not: FinancialEntryStatus.CANCELLED },
        OR: [
          { dueDate: { gte: start, lt: end } },
          { paymentDate: { gte: start, lt: end } },
        ],
      },
      select: {
        type: true,
        status: true,
        amount: true,
        paidAmount: true,
        dueDate: true,
        paymentDate: true,
      },
    });
  }

  // Observação: Prisma só aceita campos únicos em `where` de update().
  // A checagem de tenant é feita no service (findById) ANTES daqui.
  async update(
    id: string,
    data: Prisma.FinancialEntryUncheckedUpdateInput,
  ): Promise<FinancialEntry> {
    return this.prisma.financialEntry.update({
      where: { id },
      data,
      include: includeRelations,
    });
  }

  async delete(id: string): Promise<FinancialEntry> {
    return this.prisma.financialEntry.delete({
      where: { id },
    });
  }
}
