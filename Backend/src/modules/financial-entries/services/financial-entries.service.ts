import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  BusinessPartnerRole,
  FinancialDocumentType,
  FinancialEntryStatus,
  FinancialEntryType,
  PaymentMethod,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';
import { BusinessPartnersService } from '../../business-partners/services/business-partners.service';

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
  ) {}

  async create(companyId: string, dto: CreateFinancialEntryDto) {
    if (dto.employeeId) {
      await this.assertEmployee(companyId, dto.employeeId);
    } else if (dto.partnerId) {
      // A receber exige cliente; a pagar exige fornecedor.
      await this.businessPartnersService.assertHasRole(
        companyId,
        dto.partnerId,
        dto.type === FinancialEntryType.RECEIVABLE
          ? BusinessPartnerRole.CUSTOMER
          : BusinessPartnerRole.SUPPLIER,
      );
    }

    if (dto.chartOfAccountId) {
      await this.assertChartOfAccount(
        companyId,
        dto.chartOfAccountId,
      );
    }

    return this.repository.create(companyId, {
      type: dto.type,
      partnerId: dto.partnerId,
      employeeId: dto.employeeId,
      chartOfAccountId: dto.chartOfAccountId,
      issueDate: new Date(dto.issueDate),
      termDays: dto.termDays,
      dueDate: new Date(dto.dueDate),
      documentNumber: dto.documentNumber,
      documentType: dto.documentType,
      amount: dto.amount,
      paymentMethod: dto.paymentMethod,
      observation: dto.observation,
    } as Prisma.FinancialEntryUncheckedCreateInput);
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
    return this.repository.findAll(companyId, filter);
  }

  async findOne(companyId: string, id: string) {
    const entry = await this.repository.findById(companyId, id);

    if (!entry) {
      throw new NotFoundException('Título não encontrado.');
    }

    return entry;
  }

  async update(
    companyId: string,
    id: string,
    dto: UpdateFinancialEntryDto,
  ) {
    const entry = await this.findOne(companyId, id);

    if (entry.status === FinancialEntryStatus.PAID) {
      throw new BadRequestException(
        'Este título já foi baixado. Estorne a baixa antes de alterá-lo.',
      );
    }

    if (dto.partnerId && dto.partnerId !== entry.partnerId) {
      await this.businessPartnersService.assertHasRole(
        companyId,
        dto.partnerId,
        entry.type === FinancialEntryType.RECEIVABLE
          ? BusinessPartnerRole.CUSTOMER
          : BusinessPartnerRole.SUPPLIER,
      );
    }

    if (dto.chartOfAccountId) {
      await this.assertChartOfAccount(
        companyId,
        dto.chartOfAccountId,
      );
    }

    return this.repository.update(id, {
      ...dto,
      ...(dto.issueDate && {
        issueDate: new Date(dto.issueDate),
      }),
      ...(dto.dueDate && { dueDate: new Date(dto.dueDate) }),
    } as Prisma.FinancialEntryUncheckedUpdateInput);
  }

  /** Baixa: registra o pagamento (a pagar) ou recebimento (a receber). */
  async settle(
    companyId: string,
    id: string,
    dto: SettleFinancialEntryDto,
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

    return this.repository.update(id, {
      status: FinancialEntryStatus.PAID,
      paidAmount,
      paymentDate: dto.paymentDate
        ? new Date(dto.paymentDate)
        : new Date(),
      ...(dto.paymentMethod && {
        paymentMethod: dto.paymentMethod,
      }),
      ...(dto.observation && { observation: dto.observation }),
    });
  }

  /** Estorna a baixa: volta o título para "em aberto". */
  async reopen(companyId: string, id: string) {
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
    });
  }

  async cancel(companyId: string, id: string) {
    const entry = await this.findOne(companyId, id);

    if (entry.status === FinancialEntryStatus.PAID) {
      throw new BadRequestException(
        'Título baixado não pode ser cancelado. Estorne a baixa primeiro.',
      );
    }

    return this.repository.update(id, {
      status: FinancialEntryStatus.CANCELLED,
    });
  }

  async remove(companyId: string, id: string) {
    const entry = await this.findOne(companyId, id);

    if (entry.purchaseId || entry.saleId) {
      throw new BadRequestException(
        'Este título nasceu de uma compra ou venda e não pode ser excluído. Use o cancelamento.',
      );
    }

    if (entry.payrollItemId || entry.thirteenthSalaryItemId || entry.vacationGrantId) {
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
      purchaseId?: string;
      saleId?: string;
      payrollItemId?: string;
      thirteenthSalaryItemId?: string;
      vacationGrantId?: string;
      observation?: string;
    },
  ) {
    return tx.financialEntry.create({
      data: {
        companyId: params.companyId,
        type: params.type,
        partnerId: params.partnerId,
        employeeId: params.employeeId,
        amount: params.amount,
        issueDate: params.issueDate,
        termDays: params.termDays ?? undefined,
        // Sem vencimento calculado no documento: vence na própria data.
        dueDate: params.dueDate ?? params.issueDate,
        paymentMethod: params.paymentMethod ?? undefined,
        documentNumber: params.documentNumber ?? undefined,
        documentKey: params.documentKey ?? undefined,
        documentType: params.documentType ?? undefined,
        chartOfAccountId: params.chartOfAccountId ?? undefined,
        purchaseId: params.purchaseId,
        saleId: params.saleId,
        payrollItemId: params.payrollItemId,
        thirteenthSalaryItemId: params.thirteenthSalaryItemId,
        vacationGrantId: params.vacationGrantId,
        observation: params.observation,
      },
    });
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
    companyId: string,
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

  /**
   * Fluxo de caixa: totais de receita e despesa por mês do ano informado,
   * calculados a partir dos títulos de contas a receber/pagar (nunca
   * digitados diretamente).
   */
  async getCashFlow(companyId: string, year: number) {
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
}
