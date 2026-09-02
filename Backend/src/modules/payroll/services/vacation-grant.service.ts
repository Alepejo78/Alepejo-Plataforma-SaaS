import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  FinancialDocumentType,
  FinancialEntryType,
  PayrollStatus,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';
import { DocumentSequenceService } from '../../../core/document-sequence/document-sequence.service';
import { FinancialEntriesService } from '../../financial-entries/services/financial-entries.service';

import { VacationGrantRepository } from '../repositories/vacation-grant.repository';

import { VacationPeriodService } from './vacation-period.service';
import { PayrollTaxTableService } from './payroll-tax-table.service';
import { VacationGrantBuilderService } from './vacation-grant-builder.service';

import { CreateVacationGrantDto } from '../dto/create-vacation-grant.dto';
import { AdjustPayrollItemDto } from '../dto/adjust-payroll-item.dto';

const SEQUENCE_TYPE = 'VACATION';
const VACATION_CHART_ACCOUNT_CODE = '02.01.11';

function addDaysUTC(date: Date, days: number): Date {
  const result = new Date(date);

  result.setUTCDate(result.getUTCDate() + days);

  return result;
}

@Injectable()
export class VacationGrantService {
  constructor(
    private readonly repository: VacationGrantRepository,
    private readonly prisma: PrismaService,
    private readonly documentSequence: DocumentSequenceService,
    private readonly periodService: VacationPeriodService,
    private readonly taxTableService: PayrollTaxTableService,
    private readonly grantBuilder: VacationGrantBuilderService,
    private readonly financialEntriesService: FinancialEntriesService,
  ) {}

  async create(companyId: string, rootCompanyId: string, dto: CreateVacationGrantDto) {
    const employee = await this.periodService.assertEmployee(companyId, dto.employeeId);

    if (!employee.baseSalary) {
      throw new BadRequestException('Colaborador sem salário cadastrado.');
    }

    const baseSalary = Number(employee.baseSalary);

    const soldDays = dto.soldDays ?? 0;

    if (soldDays > 10) {
      throw new BadRequestException('O abono pecuniário não pode exceder 10 dias (1/3 de 30).');
    }

    const { period, availableDays } = await this.periodService.getBalance(companyId, dto.employeeId);

    if (dto.days + soldDays > availableDays) {
      throw new BadRequestException(
        `Saldo insuficiente — disponível ${availableDays} dia(s) neste período aquisitivo.`,
      );
    }

    const taxTable = await this.taxTableService.findActive(rootCompanyId, dto.startDate);

    const dependents = await this.prisma.employeeDependent.findMany({
      where: { employeeId: dto.employeeId },
    });

    const computed = this.grantBuilder.build({
      baseSalary,
      days: dto.days,
      soldDays,
      dependents,
      taxTable,
      adjustments: { otherEarnings: 0, otherDeductions: 0 },
    });

    const startDate = new Date(dto.startDate);
    const endDate = addDaysUTC(startDate, dto.days - 1);
    const returnDate = addDaysUTC(endDate, 1);

    return this.prisma.$transaction(async (tx) => {
      const number = await this.documentSequence.next(tx, companyId, SEQUENCE_TYPE);

      const grant = await tx.vacationGrant.create({
        data: {
          companyId,
          employeeId: dto.employeeId,
          vacationPeriodId: period.id,
          number,
          startDate,
          days: dto.days,
          soldDays,
          endDate,
          returnDate,
          baseSalary,
          vacationAmount: computed.vacationAmount,
          constitutionalThirdAmount: computed.constitutionalThirdAmount,
          soldAmount: computed.soldAmount,
          soldThirdAmount: computed.soldThirdAmount,
          otherEarnings: computed.otherEarnings,
          otherDeductions: computed.otherDeductions,
          grossAmount: computed.grossAmount,
          inssBase: computed.inssBase,
          inssAmount: computed.inssAmount,
          irrfBase: computed.irrfBase,
          irrfAmount: computed.irrfAmount,
          netAmount: computed.netAmount,
          employerFgtsAmount: computed.employerFgtsAmount,
          observation: dto.observation,
          lines: { create: computed.lines },
        },
        include: { lines: true },
      });

      await tx.vacationPeriod.update({
        where: { id: period.id },
        data: {
          usedDays: { increment: dto.days },
          soldDays: { increment: soldDays },
          ...(period.usedDays + dto.days + period.soldDays + soldDays >= period.totalDays && {
            status: 'CLOSED',
          }),
        },
      });

      return grant;
    });
  }

  async findAll(companyId: string, filter: { employeeId?: string; status?: PayrollStatus }) {
    return this.repository.findAll(companyId, filter);
  }

  async findOne(companyId: string, id: string) {
    const grant = await this.repository.findById(companyId, id);

    if (!grant) {
      throw new NotFoundException('Gozo de férias não encontrado.');
    }

    return grant;
  }

  async adjust(companyId: string, id: string, dto: AdjustPayrollItemDto) {
    const grant = await this.findOne(companyId, id);

    this.assertDraft(grant.status);

    const otherEarnings = dto.otherEarnings ?? Number(grant.otherEarnings);
    const otherDeductions = dto.otherDeductions ?? Number(grant.otherDeductions);

    const netAmount =
      Number(grant.vacationAmount) +
      Number(grant.constitutionalThirdAmount) +
      Number(grant.soldAmount) +
      Number(grant.soldThirdAmount) +
      otherEarnings -
      Number(grant.inssAmount) -
      Number(grant.irrfAmount) -
      otherDeductions;

    return this.repository.update(id, {
      otherEarnings,
      otherDeductions,
      netAmount: Math.round(netAmount * 100) / 100,
    });
  }

  async approve(
    companyId: string,
    rootCompanyId: string,
    id: string,
    approvedByUserId: string,
  ) {
    const grant = await this.findOne(companyId, id);

    this.assertDraft(grant.status);

    const vacationAccount = await this.prisma.chartOfAccount.findFirst({
      where: { companyId: rootCompanyId, code: VACATION_CHART_ACCOUNT_CODE },
    });

    const label = `FER-${String(grant.number).padStart(6, '0')}`;

    await this.prisma.$transaction(async (tx) => {
      await this.financialEntriesService.createFromDocument(
        tx,
        {
          companyId,
          type: FinancialEntryType.PAYABLE,
          employeeId: grant.employeeId,
          amount: Number(grant.netAmount),
          issueDate: new Date(),
          dueDate: grant.startDate,
          documentNumber: label,
          documentType: FinancialDocumentType.OUTRO,
          paymentMethod: grant.employee.paymentMethod,
          chartOfAccountId: vacationAccount?.id,
          vacationGrantId: grant.id,
          observation: `Férias ${label} — ${grant.days} dia(s) a partir de ${grant.startDate.toISOString().slice(0, 10)}.`,
        },
        approvedByUserId,
      );

      await tx.vacationGrant.update({
        where: { id: grant.id },
        data: { status: PayrollStatus.APPROVED, approvedAt: new Date(), approvedByUserId },
      });

      // Reflete na aba Saúde do colaborador — é isso que bloqueia login
      // (ver AuthService) e mostra o período na ficha. Ver `reverse()`/
      // `cancel()` abaixo pra limpeza simétrica.
      await tx.employee.update({
        where: { id: grant.employeeId },
        data: {
          onVacation: true,
          vacationStartDate: grant.startDate,
          vacationDays: grant.days,
          vacationEndDate: grant.endDate,
        },
      });
    });

    return this.findOne(companyId, id);
  }

  /** Estorna a aprovação: volta pra "aguardando aprovação" e apaga o título gerado. */
  async reverse(companyId: string, id: string) {
    const grant = await this.findOne(companyId, id);

    if (grant.status !== PayrollStatus.APPROVED) {
      throw new BadRequestException(
        'Somente gozos aprovados podem ser estornados.',
      );
    }

    if (grant.financialEntry?.status === 'PAID') {
      throw new BadRequestException(
        'Este gozo tem título já baixado — estorne a baixa antes de estornar a aprovação.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.financialEntry.deleteMany({ where: { vacationGrantId: grant.id } });

      await tx.vacationGrant.update({
        where: { id: grant.id },
        data: { status: PayrollStatus.DRAFT, approvedAt: null, approvedByUserId: null },
      });

      await this.clearEmployeeVacationIfMatches(tx, grant);
    });

    return this.findOne(companyId, id);
  }

  async cancel(companyId: string, id: string) {
    const grant = await this.findOne(companyId, id);

    if (grant.status === PayrollStatus.CANCELLED) {
      throw new BadRequestException('Este gozo de férias já está cancelado.');
    }

    if (grant.status === PayrollStatus.APPROVED && grant.financialEntry?.status === 'PAID') {
      throw new BadRequestException(
        'Este gozo tem título já baixado — estorne a baixa antes de cancelar.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      if (grant.financialEntry) {
        await tx.financialEntry.update({
          where: { id: grant.financialEntry.id },
          data: { status: 'CANCELLED' },
        });
      }

      // Devolve os dias ao saldo do período aquisitivo.
      await tx.vacationPeriod.update({
        where: { id: grant.vacationPeriodId },
        data: {
          usedDays: { decrement: grant.days },
          soldDays: { decrement: grant.soldDays },
          status: 'OPEN',
        },
      });

      await this.clearEmployeeVacationIfMatches(tx, grant);

      return tx.vacationGrant.update({
        where: { id },
        data: { status: PayrollStatus.CANCELLED },
        include: {
          employee: true,
          vacationPeriod: true,
          lines: true,
          financialEntry: true,
        },
      });
    });
  }

  async remove(companyId: string, id: string) {
    const grant = await this.findOne(companyId, id);

    if (grant.status !== PayrollStatus.CANCELLED) {
      throw new BadRequestException('Somente gozos cancelados podem ser excluídos.');
    }

    await this.prisma.vacationGrant.delete({ where: { id: grant.id } });
  }

  private assertDraft(status: PayrollStatus) {
    if (status !== PayrollStatus.DRAFT) {
      throw new BadRequestException('Somente gozos em rascunho podem ser alterados.');
    }
  }

  /**
   * Limpa `Employee.onVacation`/datas só se ainda apontarem pra este
   * gozo específico — evita apagar um "em férias" marcado manualmente
   * (ou por outro gozo) na aba Saúde por engano.
   */
  private async clearEmployeeVacationIfMatches(
    tx: Prisma.TransactionClient,
    grant: { employeeId: string; startDate: Date },
  ) {
    const employee = await tx.employee.findUnique({
      where: { id: grant.employeeId },
      select: { vacationStartDate: true },
    });

    if (
      employee?.vacationStartDate &&
      employee.vacationStartDate.getTime() === grant.startDate.getTime()
    ) {
      await tx.employee.update({
        where: { id: grant.employeeId },
        data: {
          onVacation: false,
          vacationStartDate: null,
          vacationDays: null,
          vacationEndDate: null,
        },
      });
    }
  }
}
