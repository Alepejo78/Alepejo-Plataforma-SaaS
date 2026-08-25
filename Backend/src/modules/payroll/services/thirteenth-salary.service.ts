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

import { ThirteenthSalaryRepository } from '../repositories/thirteenth-salary.repository';

import { PayrollTaxTableService } from './payroll-tax-table.service';
import {
  ThirteenthSalaryItemBuilderService,
  EmployeeForThirteenth,
} from './thirteenth-salary-item-builder.service';

import { GenerateThirteenthSalaryDto } from '../dto/generate-thirteenth-salary.dto';
import { AdjustPayrollItemDto } from '../dto/adjust-payroll-item.dto';

const SEQUENCE_TYPE = 'THIRTEENTH_SALARY';
const THIRTEENTH_CHART_ACCOUNT_CODE = '04.01.08';

const employeeInclude = { dependents: true };

@Injectable()
export class ThirteenthSalaryService {
  constructor(
    private readonly repository: ThirteenthSalaryRepository,
    private readonly prisma: PrismaService,
    private readonly documentSequence: DocumentSequenceService,
    private readonly taxTableService: PayrollTaxTableService,
    private readonly itemBuilder: ThirteenthSalaryItemBuilderService,
    private readonly financialEntriesService: FinancialEntriesService,
  ) {}

  async generate(companyId: string, rootCompanyId: string, dto: GenerateThirteenthSalaryDto) {
    const existing = await this.repository.findExisting(companyId, dto.year, dto.installment);

    if (existing) {
      throw new BadRequestException(
        `Já existe a ${dto.installment}ª parcela do 13º gerada para ${dto.year}.`,
      );
    }

    const taxTable = await this.taxTableService.findActive(
      rootCompanyId,
      new Date(Date.UTC(dto.year, 11, 20)).toISOString(),
    );

    const employees = (await this.prisma.employee.findMany({
      where: {
        companyId,
        active: true,
        baseSalary: { not: null },
        status: { in: [EmployeeStatus.ATIVO, EmployeeStatus.EXPERIENCIA] },
      },
      include: employeeInclude,
    })) as EmployeeForThirteenth[];

    if (employees.length === 0) {
      throw new BadRequestException(
        'Não há colaboradores ativos com salário cadastrado nesta empresa.',
      );
    }

    const throughMonth = dto.installment === 1 ? Math.min(new Date().getUTCMonth() + 1, 11) : 12;

    const computed = await Promise.all(
      employees.map(async (employee) => {
        const previousItem =
          dto.installment === 2
            ? await this.repository.findFirstInstallmentItem(companyId, dto.year, employee.id)
            : null;

        const item = this.itemBuilder.build(employee, {
          year: dto.year,
          installment: dto.installment,
          throughMonth,
          previousInstallmentAmount: previousItem ? Number(previousItem.grossAmount) : 0,
          taxTable,
          adjustments: { otherEarnings: 0, otherDeductions: 0 },
        });

        return { employee, item };
      }),
    );

    const eligible = computed.filter(({ item }) => item.monthsWorked > 0);

    if (eligible.length === 0) {
      throw new BadRequestException(
        'Nenhum colaborador tem ao menos 1 mês de avos nesta competência.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const number = await this.documentSequence.next(tx, companyId, SEQUENCE_TYPE);

      const totals = eligible.reduce(
        (acc, { item }) => ({
          totalGross: acc.totalGross + item.grossAmount,
          totalDeductions:
            acc.totalDeductions +
            item.inssAmount +
            item.irrfAmount +
            item.previousInstallmentAmount +
            item.otherDeductions,
          totalNet: acc.totalNet + item.netAmount,
          totalEmployerFgts: acc.totalEmployerFgts + item.employerFgtsAmount,
        }),
        { totalGross: 0, totalDeductions: 0, totalNet: 0, totalEmployerFgts: 0 },
      );

      return tx.thirteenthSalary.create({
        data: {
          companyId,
          number,
          year: dto.year,
          installment: dto.installment,
          paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : undefined,
          observation: dto.observation,
          ...totals,
          items: {
            create: eligible.map(({ employee, item }) => ({
              employeeId: employee.id,
              status: PayrollItemStatus.INCLUDED,
              baseSalary: item.baseSalary,
              monthsWorked: item.monthsWorked,
              grossAmount: item.grossAmount,
              previousInstallmentAmount: item.previousInstallmentAmount,
              otherEarnings: item.otherEarnings,
              otherDeductions: item.otherDeductions,
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
    });
  }

  async findAll(companyId: string, filter: { year?: number; installment?: number }) {
    return this.repository.findAll(companyId, filter);
  }

  async findOne(companyId: string, id: string) {
    const thirteenth = await this.repository.findById(companyId, id);

    if (!thirteenth) {
      throw new NotFoundException('13º salário não encontrado.');
    }

    return thirteenth;
  }

  async findItem(companyId: string, thirteenthSalaryId: string, itemId: string) {
    const item = await this.repository.findItem(companyId, thirteenthSalaryId, itemId);

    if (!item) {
      throw new NotFoundException('Item do 13º não encontrado.');
    }

    return item;
  }

  async adjustItem(
    companyId: string,
    thirteenthSalaryId: string,
    itemId: string,
    dto: AdjustPayrollItemDto,
  ) {
    const thirteenth = await this.findOne(companyId, thirteenthSalaryId);
    const item = await this.findItem(companyId, thirteenthSalaryId, itemId);

    this.assertDraft(thirteenth.status);

    const otherEarnings = dto.otherEarnings ?? Number(item.otherEarnings);
    const otherDeductions = dto.otherDeductions ?? Number(item.otherDeductions);

    const netAmount =
      Number(item.grossAmount) +
      otherEarnings -
      Number(item.previousInstallmentAmount) -
      Number(item.inssAmount) -
      Number(item.irrfAmount) -
      otherDeductions;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.thirteenthSalaryItem.update({
        where: { id: item.id },
        data: {
          otherEarnings,
          otherDeductions,
          netAmount: Math.round(netAmount * 100) / 100,
        },
        include: { lines: true },
      });

      await this.repository.recalculateHeaderTotals(tx, thirteenth.id);

      return updated;
    });
  }

  async excludeItem(companyId: string, thirteenthSalaryId: string, itemId: string) {
    return this.setItemStatus(companyId, thirteenthSalaryId, itemId, PayrollItemStatus.EXCLUDED);
  }

  async includeItem(companyId: string, thirteenthSalaryId: string, itemId: string) {
    return this.setItemStatus(companyId, thirteenthSalaryId, itemId, PayrollItemStatus.INCLUDED);
  }

  private async setItemStatus(
    companyId: string,
    thirteenthSalaryId: string,
    itemId: string,
    status: PayrollItemStatus,
  ) {
    const thirteenth = await this.findOne(companyId, thirteenthSalaryId);
    const item = await this.findItem(companyId, thirteenthSalaryId, itemId);

    this.assertDraft(thirteenth.status);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.thirteenthSalaryItem.update({
        where: { id: item.id },
        data: { status },
      });

      await this.repository.recalculateHeaderTotals(tx, thirteenth.id);

      return updated;
    });
  }

  /**
   * Aprova e gera 1 título a pagar por colaborador incluído — mesmo
   * padrão de `PayrollService.approve()`.
   */
  async approve(companyId: string, id: string, approvedByUserId: string) {
    const thirteenth = await this.findOne(companyId, id);

    this.assertDraft(thirteenth.status);

    const includedItems = thirteenth.items.filter(
      (item) => item.status === PayrollItemStatus.INCLUDED,
    );

    if (includedItems.length === 0) {
      throw new BadRequestException('Não há itens incluídos para aprovar.');
    }

    const thirteenthAccount = await this.prisma.chartOfAccount.findFirst({
      where: { companyId, code: THIRTEENTH_CHART_ACCOUNT_CODE },
    });

    const label = `13S-${String(thirteenth.number).padStart(6, '0')}`;
    const issueDate = new Date();
    const dueDate = thirteenth.paymentDate ?? issueDate;

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
            documentNumber: label,
            thirteenthSalaryItemId: item.id,
            observation: `13º salário (${thirteenth.installment}ª parcela) ${label} — ano ${thirteenth.year}.`,
          },
          approvedByUserId,
        );

        if (thirteenthAccount) {
          await tx.financialEntry.update({
            where: { id: entry.id },
            data: { chartOfAccountId: thirteenthAccount.id },
          });
        }
      }

      await tx.thirteenthSalary.update({
        where: { id: thirteenth.id },
        data: {
          status: PayrollStatus.APPROVED,
          approvedAt: new Date(),
          approvedByUserId,
        },
      });
    });

    return this.findOne(companyId, id);
  }

  /** Estorna a aprovação: volta pra rascunho e apaga os títulos gerados. */
  async reverse(companyId: string, id: string) {
    const thirteenth = await this.findOne(companyId, id);

    if (thirteenth.status !== PayrollStatus.APPROVED) {
      throw new BadRequestException(
        'Somente 13º aprovados podem ser estornados.',
      );
    }

    const hasSettled = thirteenth.items.some(
      (item) => item.financialEntry?.status === 'PAID',
    );

    if (hasSettled) {
      throw new BadRequestException(
        'Este 13º tem título já baixado — estorne a baixa antes de estornar a aprovação.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.financialEntry.deleteMany({
        where: {
          thirteenthSalaryItemId: { in: thirteenth.items.map((item) => item.id) },
        },
      });

      await tx.thirteenthSalary.update({
        where: { id: thirteenth.id },
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
    const thirteenth = await this.findOne(companyId, id);

    if (thirteenth.status === PayrollStatus.CANCELLED) {
      throw new BadRequestException('Este 13º já está cancelado.');
    }

    if (thirteenth.status === PayrollStatus.APPROVED) {
      const hasSettled = thirteenth.items.some(
        (item) => item.financialEntry?.status === 'PAID',
      );

      if (hasSettled) {
        throw new BadRequestException(
          'Este 13º tem título já baixado — estorne a baixa antes de cancelar.',
        );
      }

      await this.prisma.financialEntry.updateMany({
        where: { thirteenthSalaryItemId: { in: thirteenth.items.map((item) => item.id) } },
        data: { status: 'CANCELLED' },
      });
    }

    return this.repository.cancel(id);
  }

  private assertDraft(status: PayrollStatus) {
    if (status !== PayrollStatus.DRAFT) {
      throw new BadRequestException('Somente 13º em rascunho pode ser alterado.');
    }
  }
}
