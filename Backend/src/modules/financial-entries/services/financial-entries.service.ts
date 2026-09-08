import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  BusinessPartnerRole,
  FinancialDocumentType,
  FinancialEntry,
  FinancialEntryStatus,
  FinancialEntryType,
  PaymentMethod,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';
import { attachAuditNames, attachAuditName } from '../../../core/utils/audit-names.util';
import { getPeriodRange, type PeriodKind } from '../../../core/utils/date-range.util';
import { BusinessPartnersService } from '../../business-partners/services/business-partners.service';
import { PayrollConfirmationService } from '../../payroll/services/payroll-confirmation.service';
import { VacationConfirmationService } from '../../payroll/services/vacation-confirmation.service';
import { ThirteenthConfirmationService } from '../../payroll/services/thirteenth-confirmation.service';
import { SalaryAdvanceConfirmationService } from '../../payroll/services/salary-advance-confirmation.service';
import {
  EntryChargeService,
  type EntryWithPartner as EntryWithPartnerForCharge,
} from '../../entry-charges/services/entry-charge.service';

import { FinancialEntriesRepository } from '../repositories/financial-entries.repository';

import { CreateFinancialEntryDto } from '../dto/create-financial-entry.dto';
import { UpdateFinancialEntryDto } from '../dto/update-financial-entry.dto';
import { SettleFinancialEntryDto } from '../dto/settle-financial-entry.dto';
import { FinancialEntryFilterDto } from '../dto/financial-entry-filter.dto';

@Injectable()
export class FinancialEntriesService {
  constructor(
    private readonly repository: FinancialEntriesRepository,
    private readonly prisma: PrismaService,
    private readonly businessPartnersService: BusinessPartnersService,
    @Inject(forwardRef(() => PayrollConfirmationService))
    private readonly payrollConfirmationService: PayrollConfirmationService,
    @Inject(forwardRef(() => VacationConfirmationService))
    private readonly vacationConfirmationService: VacationConfirmationService,
    @Inject(forwardRef(() => ThirteenthConfirmationService))
    private readonly thirteenthConfirmationService: ThirteenthConfirmationService,
    @Inject(forwardRef(() => SalaryAdvanceConfirmationService))
    private readonly salaryAdvanceConfirmationService: SalaryAdvanceConfirmationService,
    @Inject(forwardRef(() => EntryChargeService))
    private readonly entryChargeService: EntryChargeService,
  ) {}

  async create(
    companyId: string,
    rootCompanyId: string,
    dto: CreateFinancialEntryDto,
    userId: string,
  ) {
    if (dto.employeeId) {
      await this.assertEmployee(companyId, dto.employeeId);
    } else if (dto.partnerId) {
      // A receber exige cliente; a pagar exige fornecedor.
      await this.businessPartnersService.assertHasRole(
        rootCompanyId,
        dto.partnerId,
        dto.type === FinancialEntryType.RECEIVABLE
          ? BusinessPartnerRole.CUSTOMER
          : BusinessPartnerRole.SUPPLIER,
      );
    }

    const hasItems = !!dto.items && dto.items.length > 0;

    if (hasItems) {
      for (const item of dto.items!) {
        if (item.chartOfAccountId) {
          await this.assertChartOfAccount(rootCompanyId, item.chartOfAccountId);
        }
        if (item.productId) {
          await this.assertProduct(rootCompanyId, item.productId);
        }
      }
    } else {
      await this.assertChartOfAccount(rootCompanyId, dto.chartOfAccountId!);
      await this.assertProduct(rootCompanyId, dto.productId!);
    }

    // Mais de um produto/serviço: o resumo (produto/conta/valor de
    // nível superior) segue o item de maior valor — mesmo critério já
    // usado em Compra/Venda/Cotação quando o documento tem mais de um
    // item (ver `WorkshopQuoteImportService`).
    const mainItem = hasItems ? this.pickMainItem(dto.items!) : null;
    const chartOfAccountId = mainItem?.chartOfAccountId ?? dto.chartOfAccountId;
    const productId = mainItem?.productId ?? dto.productId;
    const itemsTotal = hasItems
      ? dto.items!.reduce((sum, item) => sum + item.amount, 0)
      : undefined;

    if (dto.installments && dto.installments.length > 0) {
      const entries = await this.prisma.$transaction((tx) =>
        this.createInstallments(
          tx,
          {
            companyId,
            type: dto.type,
            partnerId: dto.partnerId,
            employeeId: dto.employeeId,
            chartOfAccountId,
            productId,
            issueDate: new Date(dto.issueDate),
            termDays: dto.termDays,
            paymentMethod: dto.paymentMethod,
            documentNumber: dto.documentNumber,
            documentType: dto.documentType,
            documentKey: dto.documentKey,
            observation: dto.observation,
            installments: dto.installments!.map((installment) => ({
              dueDate: new Date(installment.dueDate),
              amount: installment.amount,
            })),
          },
          userId,
        ),
      );

      if (hasItems) {
        await this.attachItemsProportionally(
          entries,
          dto.items!,
          itemsTotal!,
        );
      }

      for (const entry of entries) {
        void this.entryChargeService.notify(entry as EntryWithPartnerForCharge);
      }

      return entries[0];
    }

    const entry = await this.repository.create(companyId, {
      type: dto.type,
      partnerId: dto.partnerId,
      employeeId: dto.employeeId,
      chartOfAccountId,
      productId,
      issueDate: new Date(dto.issueDate),
      termDays: dto.termDays,
      dueDate: new Date(dto.dueDate!),
      documentNumber: dto.documentNumber,
      documentType: dto.documentType,
      documentKey: dto.documentKey,
      amount: hasItems ? itemsTotal! : dto.amount!,
      paymentMethod: dto.paymentMethod,
      observation: dto.observation,
      createdById: userId,
      updatedById: userId,
    } as Prisma.FinancialEntryUncheckedCreateInput);

    if (hasItems) {
      await this.repository.replaceItems(entry.id, dto.items!);
    }

    void this.entryChargeService.notify(entry as EntryWithPartnerForCharge);

    return entry;
  }

  private pickMainItem<T extends { amount: number }>(items: T[]): T {
    return items.reduce((max, item) => (item.amount > max.amount ? item : max));
  }

  /**
   * Divide os itens do documento entre as parcelas geradas,
   * proporcionalmente ao valor de cada uma — ex.: item de R$100 num
   * documento de R$225 parcelado em 2x (R$112,50 cada) vira R$50 na
   * parcela 1 e R$50 na parcela 2 (a última parcela de cada item
   * absorve o resto do arredondamento, mesmo padrão de
   * `buildAutoInstallments`).
   */
  private async attachItemsProportionally(
    entries: FinancialEntry[],
    items: {
      productId?: string;
      chartOfAccountId?: string;
      description?: string;
      quantity?: number;
      amount: number;
    }[],
    totalAmount: number,
  ) {
    for (const entry of entries) {
      const fraction = Number(entry.amount) / totalAmount;
      let allocated = 0;

      const entryItems = items.map((item, index) => {
        const isLast = index === items.length - 1;
        const amount = isLast
          ? Math.round((Number(entry.amount) - allocated) * 100) / 100
          : Math.round(item.amount * fraction * 100) / 100;

        allocated += amount;

        return { ...item, amount };
      });

      await this.repository.replaceItems(entry.id, entryItems);
    }
  }

  private async assertEmployee(companyId: string, employeeId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, companyId },
      select: { id: true },
    });

    if (!employee) {
      throw new NotFoundException(
        'Colaborador não encontrado.',
      );
    }
  }

  async findAll(
    companyId: string,
    filter: FinancialEntryFilterDto,
  ) {
    const result = await this.repository.findAll(companyId, filter);

    return {
      ...result,
      data: await attachAuditNames(this.prisma, result.data),
    };
  }

  async findOne(companyId: string, id: string) {
    const entry = await this.repository.findById(companyId, id);

    if (!entry) {
      throw new NotFoundException('Título não encontrado.');
    }

    return attachAuditName(this.prisma, entry);
  }

  async update(
    companyId: string,
    rootCompanyId: string,
    id: string,
    dto: UpdateFinancialEntryDto,
    userId: string,
  ) {
    const entry = await this.findOne(companyId, id);

    if (entry.status === FinancialEntryStatus.PAID) {
      throw new BadRequestException(
        'Este título já foi baixado. Estorne a baixa antes de alterá-lo.',
      );
    }

    if (entry.status === FinancialEntryStatus.CANCELLED) {
      throw new BadRequestException(
        'Este título está cancelado e não pode ser alterado.',
      );
    }

    if (dto.partnerId && dto.partnerId !== entry.partnerId) {
      await this.businessPartnersService.assertHasRole(
        rootCompanyId,
        dto.partnerId,
        entry.type === FinancialEntryType.RECEIVABLE
          ? BusinessPartnerRole.CUSTOMER
          : BusinessPartnerRole.SUPPLIER,
      );
    }

    const hasItems = !!dto.items && dto.items.length > 0;

    if (hasItems) {
      for (const item of dto.items!) {
        if (item.chartOfAccountId) {
          await this.assertChartOfAccount(rootCompanyId, item.chartOfAccountId);
        }
        if (item.productId) {
          await this.assertProduct(rootCompanyId, item.productId);
        }
      }
    } else {
      if (dto.chartOfAccountId) {
        await this.assertChartOfAccount(
          rootCompanyId,
          dto.chartOfAccountId,
        );
      }

      if (dto.productId) {
        await this.assertProduct(rootCompanyId, dto.productId);
      }
    }

    const mainItem = hasItems ? this.pickMainItem(dto.items!) : null;
    const chartOfAccountId = mainItem?.chartOfAccountId ?? dto.chartOfAccountId;
    const productId = mainItem?.productId ?? dto.productId;
    const itemsTotal = hasItems
      ? dto.items!.reduce((sum, item) => sum + item.amount, 0)
      : undefined;

    // Parcelar na edição: o título vira a 1ª parcela e as demais
    // nascem como títulos novos, todos com os mesmos dados (parceiro/
    // conta/produto/documento/forma de pagamento) — mesmo raciocínio
    // de `createInstallments`, só que a partir de um título que já
    // existia em vez de nascer parcelado. Com itens: cada parcela
    // (a que já existia e as novas) recebe os mesmos itens, valor
    // dividido proporcionalmente — refaz as linhas do zero.
    if (dto.installments && dto.installments.length > 0) {
      const entries = await this.splitIntoInstallments(
        entry,
        dto,
        userId,
        { chartOfAccountId, productId },
      );

      if (hasItems) {
        await this.attachItemsProportionally(
          entries,
          dto.items!,
          itemsTotal!,
        );
      }

      return entries;
    }

    const { installments: _installments, items: _items, ...rest } = dto;

    const updated = await this.repository.update(id, {
      ...rest,
      ...(chartOfAccountId && { chartOfAccountId }),
      ...(productId && { productId }),
      ...(hasItems && { amount: itemsTotal }),
      ...(dto.issueDate && {
        issueDate: new Date(dto.issueDate),
      }),
      ...(dto.dueDate && { dueDate: new Date(dto.dueDate) }),
      updatedById: userId,
    } as Prisma.FinancialEntryUncheckedUpdateInput);

    if (hasItems) {
      await this.repository.replaceItems(id, dto.items!);
    }

    return updated;
  }

  private async splitIntoInstallments(
    entry: FinancialEntry,
    dto: UpdateFinancialEntryDto,
    userId: string,
    itemsOverride: { chartOfAccountId?: string; productId?: string },
  ) {
    const [first, ...rest] = dto.installments!;

    const shared = {
      partnerId: dto.partnerId ?? entry.partnerId ?? undefined,
      employeeId: entry.employeeId ?? undefined,
      chartOfAccountId:
        itemsOverride.chartOfAccountId ?? entry.chartOfAccountId ?? undefined,
      productId: itemsOverride.productId ?? entry.productId ?? undefined,
      issueDate: dto.issueDate ? new Date(dto.issueDate) : entry.issueDate,
      termDays: dto.termDays ?? entry.termDays ?? undefined,
      documentNumber: dto.documentNumber ?? entry.documentNumber ?? undefined,
      documentType: dto.documentType ?? entry.documentType ?? undefined,
      documentKey: dto.documentKey ?? entry.documentKey ?? undefined,
      paymentMethod: dto.paymentMethod ?? entry.paymentMethod ?? undefined,
      observation: dto.observation ?? entry.observation ?? undefined,
    };

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.financialEntry.update({
        where: { id: entry.id },
        data: {
          ...shared,
          dueDate: new Date(first.dueDate),
          amount: first.amount,
          updatedById: userId,
        },
      });

      const created: FinancialEntry[] = [];

      for (const installment of rest) {
        const newEntry = await tx.financialEntry.create({
          data: {
            companyId: entry.companyId,
            type: entry.type,
            ...shared,
            dueDate: new Date(installment.dueDate),
            amount: installment.amount,
            createdById: userId,
            updatedById: userId,
          },
        });

        created.push(newEntry);
      }

      return [updated, ...created];
    });
  }

  /** Baixa: registra o pagamento (a pagar) ou recebimento (a receber). */
  async settle(
    companyId: string,
    id: string,
    dto: SettleFinancialEntryDto,
    userId: string,
  ) {
    const entry = await this.findOne(companyId, id);

    if (entry.status === FinancialEntryStatus.PAID) {
      throw new BadRequestException(
        'Este título já foi baixado.',
      );
    }

    if (entry.status === FinancialEntryStatus.CANCELLED) {
      throw new BadRequestException(
        'Este título está cancelado.',
      );
    }

    const paidAmount = dto.paidAmount ?? Number(entry.amount);

    const updated = await this.repository.update(id, {
      status: FinancialEntryStatus.PAID,
      paidAmount,
      paymentDate: dto.paymentDate
        ? new Date(dto.paymentDate)
        : new Date(),
      paymentMethod: dto.paymentMethod,
      ...(dto.bankAccountId && { bankAccountId: dto.bankAccountId }),
      ...(dto.observation && { observation: dto.observation }),
      updatedById: userId,
    });

    // Confirmação digital (Folha/Férias/13º/Adiantamento): o link só
    // sai quando o pagamento é efetivamente realizado, nunca na
    // geração/aprovação do documento.
    if (entry.payrollItemId) {
      void this.payrollConfirmationService.sendConfirmationBestEffortByItemId(
        entry.payrollItemId,
      );
    } else if (entry.vacationGrantId) {
      void this.vacationConfirmationService.sendConfirmationBestEffortByVacationGrantId(
        entry.vacationGrantId,
      );
    } else if (entry.thirteenthSalaryItemId) {
      void this.thirteenthConfirmationService.sendConfirmationBestEffortByItemId(
        entry.thirteenthSalaryItemId,
      );
    } else if (entry.salaryAdvanceId) {
      void this.salaryAdvanceConfirmationService.sendConfirmationBestEffortBySalaryAdvanceId(
        entry.salaryAdvanceId,
      );
    }

    return updated;
  }

  /** Reenvia a cobrança (boleto/PIX/cartão/transferência) já gerada, ou gera na primeira vez. */
  async sendCharge(companyId: string, id: string) {
    await this.findOne(companyId, id);

    await this.entryChargeService.resend(companyId, id);

    return { sent: true };
  }

  /** Estorna a baixa: volta o título para "em aberto". */
  async reopen(companyId: string, id: string, userId: string) {
    const entry = await this.findOne(companyId, id);

    if (entry.status !== FinancialEntryStatus.PAID) {
      throw new BadRequestException(
        'Somente títulos baixados podem ser estornados.',
      );
    }

    return this.repository.update(id, {
      status: FinancialEntryStatus.OPEN,
      paidAmount: 0,
      paymentDate: null,
      updatedById: userId,
    });
  }

  async cancel(companyId: string, id: string, userId: string) {
    const entry = await this.findOne(companyId, id);

    if (entry.status === FinancialEntryStatus.PAID) {
      throw new BadRequestException(
        'Título baixado não pode ser cancelado. Estorne a baixa primeiro.',
      );
    }

    return this.repository.update(id, {
      status: FinancialEntryStatus.CANCELLED,
      updatedById: userId,
    });
  }

  async remove(companyId: string, id: string) {
    const entry = await this.findOne(companyId, id);

    if (entry.purchaseId || entry.saleId) {
      throw new BadRequestException(
        'Este título nasceu de uma compra ou venda e não pode ser excluído. Use o cancelamento.',
      );
    }

    if (
      entry.payrollItemId ||
      entry.thirteenthSalaryItemId ||
      entry.vacationGrantId ||
      entry.salaryAdvanceId
    ) {
      throw new BadRequestException(
        'Este título nasceu de uma folha de pagamento e não pode ser excluído. Use o cancelamento.',
      );
    }

    return this.repository.delete(id);
  }

  /**
   * Gera o título automaticamente a partir de uma compra recebida ou
   * de uma venda aprovada. Chamado de dentro da transação daqueles
   * fluxos, por isso recebe o `tx`.
   */
  async createFromDocument(
    tx: Prisma.TransactionClient,
    params: {
      companyId: string;
      type: FinancialEntryType;
      /// Exatamente um dos dois — parceiro (compra/venda) ou
      /// colaborador (folha/13º/férias).
      partnerId?: string;
      employeeId?: string;
      amount: number;
      issueDate: Date;
      termDays?: number | null;
      dueDate?: Date | null;
      paymentMethod?: PaymentMethod | null;
      documentNumber?: string | null;
      documentKey?: string | null;
      documentType?: FinancialDocumentType | null;
      /// Tipo de despesa/receita herdado do documento (compra/venda).
      chartOfAccountId?: string | null;
      productId?: string | null;
      purchaseId?: string;
      purchaseOrderId?: string;
      quotationId?: string;
      saleId?: string;
      payrollItemId?: string;
      thirteenthSalaryItemId?: string;
      vacationGrantId?: string;
      salaryAdvanceId?: string;
      observation?: string;
    },
    userId: string,
  ) {
    const [entry] = await this.createInstallments(
      tx,
      {
        ...params,
        installments: [
          {
            // Sem vencimento calculado no documento: vence na própria data.
            dueDate: params.dueDate ?? params.issueDate,
            amount: params.amount,
          },
        ],
      },
      userId,
    );

    return entry;
  }

  /**
   * Mesma coisa que `createFromDocument`, mas em N parcelas — cada
   * uma vira uma `FinancialEntry` própria (título parcelado não existe
   * como conceito no banco, só N títulos com o mesmo documento).
   * Usado pela importação de nota fiscal (`InvoiceImportModule`)
   * quando a nota traz mais de uma duplicata/vencimento.
   */
  async createInstallments(
    tx: Prisma.TransactionClient,
    params: {
      companyId: string;
      type: FinancialEntryType;
      partnerId?: string;
      employeeId?: string;
      installments: { dueDate: Date; amount: number }[];
      issueDate: Date;
      termDays?: number | null;
      paymentMethod?: PaymentMethod | null;
      documentNumber?: string | null;
      documentKey?: string | null;
      documentType?: FinancialDocumentType | null;
      chartOfAccountId?: string | null;
      productId?: string | null;
      purchaseId?: string;
      purchaseOrderId?: string;
      quotationId?: string;
      saleId?: string;
      payrollItemId?: string;
      thirteenthSalaryItemId?: string;
      vacationGrantId?: string;
      salaryAdvanceId?: string;
      observation?: string;
    },
    userId: string,
  ) {
    const entries: FinancialEntry[] = [];

    for (const installment of params.installments) {
      const entry = await tx.financialEntry.create({
        data: {
          companyId: params.companyId,
          type: params.type,
          partnerId: params.partnerId,
          employeeId: params.employeeId,
          amount: installment.amount,
          issueDate: params.issueDate,
          termDays: params.termDays ?? undefined,
          dueDate: installment.dueDate,
          paymentMethod: params.paymentMethod ?? undefined,
          documentNumber: params.documentNumber ?? undefined,
          documentKey: params.documentKey ?? undefined,
          documentType: params.documentType ?? undefined,
          chartOfAccountId: params.chartOfAccountId ?? undefined,
          productId: params.productId ?? undefined,
          purchaseId: params.purchaseId,
          purchaseOrderId: params.purchaseOrderId,
          quotationId: params.quotationId,
          saleId: params.saleId,
          payrollItemId: params.payrollItemId,
          thirteenthSalaryItemId: params.thirteenthSalaryItemId,
          vacationGrantId: params.vacationGrantId,
          salaryAdvanceId: params.salaryAdvanceId,
          observation: params.observation,
          createdById: userId,
          updatedById: userId,
        },
        include: { partner: true },
      });

      entries.push(entry);
    }

    return entries;
  }

  /**
   * Acompanhamento por tipo: quanto foi de cada conta do plano de
   * contas no ano, separando o que já foi pago do que ainda está em
   * aberto — as duas leituras interessam (quanto saiu do caixa e
   * quanto ainda vai sair).
   *
   * Título sem conta escolhida entra como "Sem classificação", em vez
   * de sumir do gráfico: some do total e some da percepção de quanto
   * ainda falta classificar.
   */
  async getAccountBreakdown(
    companyId: string | string[],
    year: number,
    type: FinancialEntryType,
  ) {
    const entries = await this.repository.findForAccountBreakdown(
      companyId,
      year,
      type,
    );

    const porConta = new Map<
      string,
      { code: string | null; description: string; pago: number; emAberto: number }
    >();

    for (const entry of entries) {
      const chave = entry.chartOfAccount?.id ?? 'sem-classificacao';

      const atual =
        porConta.get(chave) ??
        {
          code: entry.chartOfAccount?.code ?? null,
          description:
            entry.chartOfAccount?.description ?? 'Sem classificação',
          pago: 0,
          emAberto: 0,
        };

      if (entry.status === 'PAID') {
        atual.pago += Number(entry.paidAmount);
      } else {
        atual.emAberto += Number(entry.amount) - Number(entry.paidAmount);
      }

      porConta.set(chave, atual);
    }

    return [...porConta.values()]
      .map((item) => ({ ...item, total: item.pago + item.emAberto }))
      .filter((item) => item.total > 0)
      .sort((a, b) => b.total - a.total);
  }

  /** Total (pago + em aberto) agrupado por forma de pagamento — pro gráfico de pizza da Visão geral. */
  async getPaymentMethodBreakdown(
    companyId: string | string[],
    year: number,
    type: FinancialEntryType,
  ) {
    const entries = await this.repository.findForPaymentMethodBreakdown(
      companyId,
      year,
      type,
    );

    const porForma = new Map<string, number>();

    for (const entry of entries) {
      const chave = entry.paymentMethod ?? 'NAO_INFORMADO';
      const valor =
        entry.status === 'PAID'
          ? Number(entry.paidAmount)
          : Number(entry.amount) - Number(entry.paidAmount);

      porForma.set(chave, (porForma.get(chave) ?? 0) + valor);
    }

    return [...porForma.entries()]
      .map(([method, total]) => ({ method, total }))
      .filter((item) => item.total > 0)
      .sort((a, b) => b.total - a.total);
  }

  /**
   * Fluxo de caixa: totais de receita e despesa por mês do ano informado,
   * calculados a partir dos títulos de contas a receber/pagar (nunca
   * digitados diretamente).
   */
  /** `companyId` também aceita array — ver `FinancialEntriesRepository.findForCashFlow`. */
  async getCashFlow(companyId: string | string[], year: number) {
    const entries = await this.repository.findForCashFlow(
      companyId,
      year,
    );

    const today = new Date();

    const emptyBucket = () => ({
      total: 0,
      settled: 0,
      open: 0,
      overdue: 0,
    });

    const months = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      receivable: emptyBucket(),
      payable: emptyBucket(),
      balance: 0,
      cumulativeBalance: 0,
    }));

    const inYear = (d: Date) => d.getUTCFullYear() === year;
    const kind =
      (type: FinancialEntryType) =>
      (m: (typeof months)[number]) =>
        type === FinancialEntryType.RECEIVABLE
          ? m.receivable
          : m.payable;

    for (const entry of entries) {
      const bucketOf = kind(entry.type);
      const amount = Number(entry.amount);

      // "Total/aberto/atrasado" seguem o vencimento (visão de
      // compromisso). "Recebido/pago" segue a data em que o dinheiro
      // de fato entrou/saiu — uma baixa antecipada ou atrasada cai no
      // mês em que ela aconteceu, não no mês do vencimento.
      if (inYear(entry.dueDate)) {
        const bucket = bucketOf(months[entry.dueDate.getUTCMonth()]);

        bucket.total += amount;

        if (entry.status !== FinancialEntryStatus.PAID) {
          if (entry.dueDate < today) {
            bucket.overdue += amount;
          } else {
            bucket.open += amount;
          }
        }
      }

      if (
        entry.status === FinancialEntryStatus.PAID &&
        entry.paymentDate &&
        inYear(entry.paymentDate)
      ) {
        const bucket = bucketOf(
          months[entry.paymentDate.getUTCMonth()],
        );

        bucket.settled += Number(entry.paidAmount);
      }
    }

    let cumulativeBalance = 0;

    for (const month of months) {
      month.balance = month.receivable.total - month.payable.total;
      cumulativeBalance += month.balance;
      month.cumulativeBalance = cumulativeBalance;
    }

    return { year, months };
  }

  /**
   * Fluxo de caixa dia a dia de um mês — visão mais detalhada que
   * `getCashFlow` (mensal) e `getPeriodSummary` (um período por vez).
   * Por dia: `previsto` segue o vencimento (qualquer título não
   * cancelado, pago ou não — é o "estava programado pra esse dia"),
   * `recebido`/`pago` segue a data em que o título foi baixado de
   * verdade. Os dois JUNTOS (não um substituindo o outro) — decisão
   * do usuário, 08-09-2026: um título baixado no mesmo dia do
   * vencimento conta nos dois, de propósito.
   */
  async getDailyCashFlow(companyId: string, year: number, month: number) {
    const entries = await this.repository.findForDailyCashFlow(
      companyId,
      year,
      month,
    );

    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const firstWeekday = new Date(
      Date.UTC(year, month - 1, 1),
    ).getUTCDay();

    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;

      return {
        day,
        week: Math.ceil((day + firstWeekday) / 7),
        receivablePrevisto: 0,
        receivableRecebido: 0,
        payablePrevisto: 0,
        payablePago: 0,
      };
    });

    const inMonth = (d: Date) =>
      d.getUTCFullYear() === year && d.getUTCMonth() === month - 1;

    for (const entry of entries) {
      if (inMonth(entry.dueDate)) {
        const bucket = days[entry.dueDate.getUTCDate() - 1];
        const amount = Number(entry.amount);

        if (entry.type === FinancialEntryType.RECEIVABLE) {
          bucket.receivablePrevisto += amount;
        } else {
          bucket.payablePrevisto += amount;
        }
      }

      if (
        entry.status === FinancialEntryStatus.PAID &&
        entry.paymentDate &&
        inMonth(entry.paymentDate)
      ) {
        const bucket = days[entry.paymentDate.getUTCDate() - 1];
        const paidAmount = Number(entry.paidAmount);

        if (entry.type === FinancialEntryType.RECEIVABLE) {
          bucket.receivableRecebido += paidAmount;
        } else {
          bucket.payablePago += paidAmount;
        }
      }
    }

    return { year, month, days };
  }

  /**
   * Mesma separação de `getCashFlow` (total/aberto/atrasado por
   * vencimento; recebido/pago por data de pagamento), só que num
   * período curto e arbitrário (dia/semana/mês) em vez do ano inteiro
   * — usado pela tela de acompanhamento de fluxo de caixa.
   */
  async getPeriodSummary(
    companyId: string | string[],
    period: PeriodKind,
    referenceDate: Date,
  ) {
    const { start, end } = getPeriodRange(period, referenceDate);

    const entries = await this.repository.findForPeriodSummary(
      companyId,
      start,
      end,
    );

    const today = new Date();

    const emptyBucket = () => ({
      total: 0,
      settled: 0,
      open: 0,
      overdue: 0,
    });

    const receivable = emptyBucket();
    const payable = emptyBucket();

    const inRange = (d: Date) => d >= start && d < end;

    for (const entry of entries) {
      const bucket =
        entry.type === FinancialEntryType.RECEIVABLE
          ? receivable
          : payable;
      const amount = Number(entry.amount);

      if (inRange(entry.dueDate) && entry.status !== FinancialEntryStatus.PAID) {
        if (entry.dueDate < today) {
          bucket.overdue += amount;
        } else {
          bucket.open += amount;
        }
      }

      if (
        entry.status === FinancialEntryStatus.PAID &&
        entry.paymentDate &&
        inRange(entry.paymentDate)
      ) {
        bucket.settled += Number(entry.paidAmount);
      }
    }

    // "Total do período" é a soma do que aparece no card (recebido/
    // pago + previsto + vencido) — não só o que venceu no período,
    // senão um título pago adiantado ou atrasado (data de pagamento
    // fora do vencimento) aparecia em "Recebido"/"Pago" mas ficava de
    // fora do total, dando a impressão de que o total esqueceu esse
    // valor.
    receivable.total = receivable.settled + receivable.open + receivable.overdue;
    payable.total = payable.settled + payable.open + payable.overdue;

    return { period, start, end, receivable, payable };
  }

  private async assertChartOfAccount(
    companyId: string,
    chartOfAccountId: string,
  ) {
    const account = await this.prisma.chartOfAccount.findFirst({
      where: { id: chartOfAccountId, companyId },
    });

    if (!account) {
      throw new NotFoundException(
        'Conta contábil não encontrada.',
      );
    }

    return account;
  }

  /** Produto/serviço é cadastro de grupo ("Interprise") — `companyId` aqui é sempre a raiz do grupo (rootCompanyId). */
  private async assertProduct(
    rootCompanyId: string,
    productId: string,
  ) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, companyId: rootCompanyId },
    });

    if (!product) {
      throw new NotFoundException('Produto/serviço não encontrado.');
    }

    return product;
  }
}
