import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  EmployeeStatus,
  FinancialEntryType,
  PayrollItemStatus,
  PayrollStatus,
} from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';
import { DocumentSequenceService } from '../../../core/document-sequence/document-sequence.service';
import { FinancialEntriesService } from '../../financial-entries/services/financial-entries.service';

import { PayrollRepository } from '../repositories/payroll.repository';

import { PayrollTaxTableService } from './payroll-tax-table.service';
import { PayrollSettingsService } from './payroll-settings.service';
import { PayrollMonthSummaryService } from './payroll-month-summary.service';
import { PayrollItemBuilderService, EmployeeForPayroll } from './payroll-item-builder.service';

import { GeneratePayrollDto } from '../dto/generate-payroll.dto';
import { AdjustPayrollItemDto } from '../dto/adjust-payroll-item.dto';
import { PayrollFilterDto } from '../dto/payroll-filter.dto';

const SEQUENCE_TYPE = 'PAYROLL';
const SALARY_CHART_ACCOUNT_CODE = '04.01.18';

type PayrollDetail = NonNullable<Awaited<ReturnType<PayrollRepository['findById']>>>;
type PayrollItemDetail = NonNullable<Awaited<ReturnType<PayrollRepository['findItem']>>>;

const employeeInclude = {
  dependents: true,
  employeeBenefits: {
    include: { benefit: { select: { isTransportVoucher: true } } },
  },
};

@Injectable()
export class PayrollService {
  constructor(
    private readonly repository: PayrollRepository,
    private readonly prisma: PrismaService,
    private readonly documentSequence: DocumentSequenceService,
    private readonly taxTableService: PayrollTaxTableService,
    private readonly settingsService: PayrollSettingsService,
    private readonly monthSummaryService: PayrollMonthSummaryService,
    private readonly itemBuilder: PayrollItemBuilderService,
    private readonly financialEntriesService: FinancialEntriesService,
  ) {}

  async generate(companyId: string, rootCompanyId: string, dto: GeneratePayrollDto) {
    const existing = await this.repository.findExisting(
      companyId,
      dto.competenceYear,
      dto.competenceMonth,
    );

    if (existing) {
      throw new BadRequestException(
        'Já existe uma folha gerada para esta competência.',
      );
    }

    const taxTable = await this.taxTableService.findActive(
      rootCompanyId,
      new Date(Date.UTC(dto.competenceYear, dto.competenceMonth - 1, 1)).toISOString(),
    );

    const settings = await this.settingsService.find(rootCompanyId);

    const employees = (await this.prisma.employee.findMany({
      where: {
        companyId,
        active: true,
        baseSalary: { not: null },
        status: { in: [EmployeeStatus.ATIVO, EmployeeStatus.EXPERIENCIA] },
      },
      include: employeeInclude,
    })) as EmployeeForPayroll[];

    if (employees.length === 0) {
      throw new BadRequestException(
        'Não há colaboradores ativos com salário cadastrado nesta empresa.',
      );
    }

    const computed = await Promise.all(
      employees.map(async (employee) => {
        const summary = await this.monthSummaryService.getSummary(
          companyId,
          employee.id,
          dto.competenceYear,
          dto.competenceMonth,
        );

        return {
          employee,
          summary,
          item: this.itemBuilder.build(employee, summary, taxTable, settings, {
            otherEarnings: 0,
            otherDeductions: 0,
          }),
        };
      }),
    );

    return this.prisma.$transaction(async (tx) => {
      const number = await this.documentSequence.next(tx, companyId, SEQUENCE_TYPE);

      const totals = computed.reduce(
        (acc, { item }) => ({
          totalGross: acc.totalGross + item.grossAmount,
          totalDeductions:
            acc.totalDeductions +
            item.inssAmount +
            item.irrfAmount +
            item.absenceDeductionAmount +
            item.transportVoucherDeduction +
            item.otherDeductions,
          totalNet: acc.totalNet + item.netAmount,
          totalEmployerFgts: acc.totalEmployerFgts + item.employerFgtsAmount,
        }),
        { totalGross: 0, totalDeductions: 0, totalNet: 0, totalEmployerFgts: 0 },
      );

      const payroll = await tx.payroll.create({
        data: {
          companyId,
          number,
          competenceYear: dto.competenceYear,
          competenceMonth: dto.competenceMonth,
          paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : undefined,
          observation: dto.observation,
          ...totals,
          items: {
            create: computed.map(({ employee, item }) => ({
              employeeId: employee.id,
              status: PayrollItemStatus.INCLUDED,
              baseSalary: item.baseSalary,
              salaryType: item.salaryType,
              dependentsCount: item.dependentsCount,
              workedMinutes: item.workedMinutes,
              expectedMinutes: item.expectedMinutes,
              extraMinutes: item.extraMinutes,
              extraAmount: item.extraAmount,
              unjustifiedAbsenceDays: item.unjustifiedAbsenceDays,
              absenceDeductionAmount: item.absenceDeductionAmount,
              transportVoucherDeduction: item.transportVoucherDeduction,
              otherEarnings: item.otherEarnings,
              otherDeductions: item.otherDeductions,
              grossAmount: item.grossAmount,
              inssBase: item.inssBase,
              inssAmount: item.inssAmount,
              irrfBase: item.irrfBase,
              irrfAmount: item.irrfAmount,
              netAmount: item.netAmount,
              employerFgtsAmount: item.employerFgtsAmount,
              lines: { create: item.lines },
            })),
          },
        },
        include: { items: true },
      });

      return payroll;
    });
  }

  async findAll(companyId: string, filter: PayrollFilterDto) {
    return this.repository.findAll(companyId, filter);
  }

  async findOne(companyId: string, id: string) {
    const payroll = await this.repository.findById(companyId, id);

    if (!payroll) {
      throw new NotFoundException('Folha de pagamento não encontrada.');
    }

    return payroll;
  }

  async findItem(companyId: string, payrollId: string, itemId: string) {
    const item = await this.repository.findItem(companyId, payrollId, itemId);

    if (!item) {
      throw new NotFoundException('Item da folha não encontrado.');
    }

    return item;
  }

  /** Recalcula um item a partir do ponto/faltas atuais — mantém os ajustes manuais já lançados. */
  async recalculateItem(companyId: string, rootCompanyId: string, payrollId: string, itemId: string) {
    const payroll = await this.findOne(companyId, payrollId);
    const item = await this.findItem(companyId, payrollId, itemId);

    this.assertDraft(payroll.status);

    return this.rebuildItem(rootCompanyId, payroll, item, {
      otherEarnings: Number(item.otherEarnings),
      otherDeductions: Number(item.otherDeductions),
    });
  }

  async adjustItem(
    companyId: string,
    rootCompanyId: string,
    payrollId: string,
    itemId: string,
    dto: AdjustPayrollItemDto,
  ) {
    const payroll = await this.findOne(companyId, payrollId);
    const item = await this.findItem(companyId, payrollId, itemId);

    this.assertDraft(payroll.status);

    return this.rebuildItem(rootCompanyId, payroll, item, {
      otherEarnings: dto.otherEarnings ?? Number(item.otherEarnings),
      otherDeductions: dto.otherDeductions ?? Number(item.otherDeductions),
    });
  }

  private async rebuildItem(
    rootCompanyId: string,
    payroll: PayrollDetail,
    item: PayrollItemDetail,
    adjustments: { otherEarnings: number; otherDeductions: number },
  ) {
    const employee = (await this.prisma.employee.findUnique({
      where: { id: item.employeeId },
      include: employeeInclude,
    })) as EmployeeForPayroll | null;

    if (!employee) {
      throw new NotFoundException('Colaborador não encontrado.');
    }

    const taxTable = await this.taxTableService.findActive(
      rootCompanyId,
      new Date(Date.UTC(payroll.competenceYear, payroll.competenceMonth - 1, 1)).toISOString(),
    );
    const settings = await this.settingsService.find(rootCompanyId);

    const summary = await this.monthSummaryService.getSummary(
      payroll.companyId,
      employee.id,
      payroll.competenceYear,
      payroll.competenceMonth,
    );

    const computed = this.itemBuilder.build(employee, summary, taxTable, settings, adjustments);

    return this.prisma.$transaction(async (tx) => {
      await tx.payrollItemLine.deleteMany({ where: { payrollItemId: item.id } });

      const updated = await tx.payrollItem.update({
        where: { id: item.id },
        data: {
          baseSalary: computed.baseSalary,
          salaryType: computed.salaryType,
          dependentsCount: computed.dependentsCount,
          workedMinutes: computed.workedMinutes,
          expectedMinutes: computed.expectedMinutes,
          extraMinutes: computed.extraMinutes,
          extraAmount: computed.extraAmount,
          unjustifiedAbsenceDays: computed.unjustifiedAbsenceDays,
          absenceDeductionAmount: computed.absenceDeductionAmount,
          transportVoucherDeduction: computed.transportVoucherDeduction,
          otherEarnings: computed.otherEarnings,
          otherDeductions: computed.otherDeductions,
          grossAmount: computed.grossAmount,
          inssBase: computed.inssBase,
          inssAmount: computed.inssAmount,
          irrfBase: computed.irrfBase,
          irrfAmount: computed.irrfAmount,
          netAmount: computed.netAmount,
          employerFgtsAmount: computed.employerFgtsAmount,
          lines: { create: computed.lines },
        },
        include: { lines: true },
      });

      await this.repository.recalculateHeaderTotals(tx, payroll.id);

      return updated;
    });
  }

  async excludeItem(companyId: string, payrollId: string, itemId: string) {
    const payroll = await this.findOne(companyId, payrollId);
    const item = await this.findItem(companyId, payrollId, itemId);

    this.assertDraft(payroll.status);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.payrollItem.update({
        where: { id: item.id },
        data: { status: PayrollItemStatus.EXCLUDED },
      });

      await this.repository.recalculateHeaderTotals(tx, payroll.id);

      return updated;
    });
  }

  async includeItem(companyId: string, payrollId: string, itemId: string) {
    const payroll = await this.findOne(companyId, payrollId);
    const item = await this.findItem(companyId, payrollId, itemId);

    this.assertDraft(payroll.status);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.payrollItem.update({
        where: { id: item.id },
        data: { status: PayrollItemStatus.INCLUDED },
      });

      await this.repository.recalculateHeaderTotals(tx, payroll.id);

      return updated;
    });
  }

  /**
   * Aprova a folha: bloqueia se houver ponto pendente de aprovação na
   * competência (mesma checagem de `pendingDays` do resumo mensal), e
   * gera 1 título a pagar por colaborador incluído — mesmo padrão de
   * `QuoteService.approve()` (transação + `FinancialEntriesService.
   * createFromDocument`).
   */
  async approve(companyId: string, id: string, approvedByUserId: string) {
    const payroll = await this.findOne(companyId, id);

    this.assertDraft(payroll.status);

    const includedItems = payroll.items.filter(
      (item) => item.status === PayrollItemStatus.INCLUDED,
    );

    if (includedItems.length === 0) {
      throw new BadRequestException(
        'Não há itens incluídos nesta folha para aprovar.',
      );
    }

    for (const item of includedItems) {
      const summary = await this.monthSummaryService.getSummary(
        companyId,
        item.employeeId,
        payroll.competenceYear,
        payroll.competenceMonth,
      );

      if (summary.pendingDays > 0) {
        throw new BadRequestException(
          `${item.employee.name} tem ponto pendente de aprovação nesta competência — aprove o ponto antes de aprovar a folha.`,
        );
      }
    }

    const salaryAccount = await this.prisma.chartOfAccount.findFirst({
      where: { companyId, code: SALARY_CHART_ACCOUNT_CODE },
    });

    const payrollNumber = `FOL-${String(payroll.number).padStart(6, '0')}`;
    const issueDate = new Date();
    const dueDate = payroll.paymentDate ?? issueDate;

    await this.prisma.$transaction(async (tx) => {
      for (const item of includedItems) {
        const entry = await this.financialEntriesService.createFromDocument(
          tx,
          {
            companyId,
            type: FinancialEntryType.PAYABLE,
            employeeId: item.employeeId,
            amount: Number(item.netAmount),
            issueDate,
            dueDate,
            documentNumber: payrollNumber,
            payrollItemId: item.id,
            observation: `Folha de pagamento ${payrollNumber} — competência ${String(payroll.competenceMonth).padStart(2, '0')}/${payroll.competenceYear}.`,
          },
          approvedByUserId,
        );

        if (salaryAccount) {
          await tx.financialEntry.update({
            where: { id: entry.id },
            data: { chartOfAccountId: salaryAccount.id },
          });
        }
      }

      await tx.payroll.update({
        where: { id: payroll.id },
        data: {
          status: PayrollStatus.APPROVED,
          approvedAt: new Date(),
          approvedByUserId,
        },
      });
    });

    return this.findOne(companyId, id);
  }

  /**
   * Estorna a aprovação: volta a folha pra rascunho (reabre edição) e
   * apaga os títulos gerados — mesmo padrão de `FinancialEntriesService.
   * reopen()`. Bloqueia se algum título já tiver sido baixado (mesma
   * checagem de `cancel()`).
   */
  async reverse(companyId: string, id: string) {
    const payroll = await this.findOne(companyId, id);

    if (payroll.status !== PayrollStatus.APPROVED) {
      throw new BadRequestException(
        'Somente folhas aprovadas podem ser estornadas.',
      );
    }

    const hasSettled = payroll.items.some(
      (item) => item.financialEntry?.status === 'PAID',
    );

    if (hasSettled) {
      throw new BadRequestException(
        'Esta folha tem título já baixado — estorne a baixa antes de estornar a aprovação.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.financialEntry.deleteMany({
        where: { payrollItemId: { in: payroll.items.map((item) => item.id) } },
      });

      await tx.payroll.update({
        where: { id: payroll.id },
        data: {
          status: PayrollStatus.DRAFT,
          approvedAt: null,
          approvedByUserId: null,
        },
      });
    });

    return this.findOne(companyId, id);
  }

  async cancel(companyId: string, id: string) {
    const payroll = await this.findOne(companyId, id);

    if (payroll.status === PayrollStatus.CANCELLED) {
      throw new BadRequestException('Esta folha já está cancelada.');
    }

    if (payroll.status === PayrollStatus.APPROVED) {
      const hasSettled = payroll.items.some(
        (item) => item.financialEntry?.status === 'PAID',
      );

      if (hasSettled) {
        throw new BadRequestException(
          'Esta folha tem título já baixado — estorne a baixa antes de cancelar.',
        );
      }

      await this.prisma.financialEntry.updateMany({
        where: { payrollItemId: { in: payroll.items.map((item) => item.id) } },
        data: { status: 'CANCELLED' },
      });
    }

    return this.repository.cancel(id);
  }

  private assertDraft(status: PayrollStatus) {
    if (status !== PayrollStatus.DRAFT) {
      throw new BadRequestException(
        'Somente folhas em rascunho podem ser alteradas.',
      );
    }
  }
}
