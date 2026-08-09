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
    // A receber exige cliente; a pagar exige fornecedor.
    await this.businessPartnersService.assertHasRole(
      companyId,
      dto.partnerId,
      dto.type === FinancialEntryType.RECEIVABLE
        ? BusinessPartnerRole.CUSTOMER
        : BusinessPartnerRole.SUPPLIER,
    );

    if (dto.chartOfAccountId) {
      await this.assertChartOfAccount(
        companyId,
        dto.chartOfAccountId,
      );
    }

    return this.repository.create(companyId, {
      type: dto.type,
      partnerId: dto.partnerId,
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
      partnerId: string;
      amount: number;
      issueDate: Date;
      termDays?: number | null;
      dueDate?: Date | null;
      paymentMethod?: PaymentMethod | null;
      documentNumber?: string | null;
      documentKey?: string | null;
      documentType?: FinancialDocumentType | null;
      purchaseId?: string;
      saleId?: string;
      observation?: string;
    },
  ) {
    return tx.financialEntry.create({
      data: {
        companyId: params.companyId,
        type: params.type,
        partnerId: params.partnerId,
        amount: params.amount,
        issueDate: params.issueDate,
        termDays: params.termDays ?? undefined,
        // Sem vencimento calculado no documento: vence na própria data.
        dueDate: params.dueDate ?? params.issueDate,
        paymentMethod: params.paymentMethod ?? undefined,
        documentNumber: params.documentNumber ?? undefined,
        documentKey: params.documentKey ?? undefined,
        documentType: params.documentType ?? undefined,
        purchaseId: params.purchaseId,
        saleId: params.saleId,
        observation: params.observation,
      },
    });
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

    for (const entry of entries) {
      const bucket =
        months[entry.dueDate.getUTCMonth()][
          entry.type === FinancialEntryType.RECEIVABLE
            ? 'receivable'
            : 'payable'
        ];

      const amount = Number(entry.amount);

      bucket.total += amount;

      if (entry.status === FinancialEntryStatus.PAID) {
        bucket.settled += Number(entry.paidAmount);
      } else if (entry.dueDate < today) {
        bucket.overdue += amount;
      } else {
        bucket.open += amount;
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
