import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  FinancialDocumentType,
  FinancialEntryType,
  PayrollStatus,
} from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';
import { DocumentSequenceService } from '../../../core/document-sequence/document-sequence.service';
import { FinancialEntriesService } from '../../financial-entries/services/financial-entries.service';

import { SalaryAdvanceRepository } from '../repositories/salary-advance.repository';

import { CreateSalaryAdvanceDto } from '../dto/create-salary-advance.dto';

const SEQUENCE_TYPE = 'SALARY_ADVANCE';
const SALARY_ADVANCE_CHART_ACCOUNT_CODE = '02.01.08';

/**
 * Adiantamento salarial — mesmo fluxo DRAFT → APPROVED → título a
 * pagar dos outros módulos de RH (Férias, 13º), só que bem mais
 * simples: um valor fixo, sem cálculo de INSS/IRRF/FGTS (o desconto
 * de verdade acontece depois, na folha normal, lançado manualmente
 * em "Outros descontos" no ajuste do item).
 */
@Injectable()
export class SalaryAdvanceService {
  constructor(
    private readonly repository: SalaryAdvanceRepository,
    private readonly prisma: PrismaService,
    private readonly documentSequence: DocumentSequenceService,
    private readonly financialEntriesService: FinancialEntriesService,
  ) {}

  async create(companyId: string, dto: CreateSalaryAdvanceDto) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, companyId },
    });

    if (!employee) {
      throw new NotFoundException('Colaborador não encontrado.');
    }

    return this.prisma.$transaction(async (tx) => {
      const number = await this.documentSequence.next(tx, companyId, SEQUENCE_TYPE);

      return tx.salaryAdvance.create({
        data: {
          companyId,
          employeeId: dto.employeeId,
          number,
          amount: dto.amount,
          installments: dto.installments ?? 1,
          observation: dto.observation,
        },
        include: {
          employee: { select: { id: true, name: true } },
          financialEntry: true,
        },
      });
    });
  }

  async findAll(companyId: string, filter: { employeeId?: string; status?: PayrollStatus }) {
    return this.repository.findAll(companyId, filter);
  }

  async findOne(companyId: string, id: string) {
    const advance = await this.repository.findById(companyId, id);

    if (!advance) {
      throw new NotFoundException('Adiantamento salarial não encontrado.');
    }

    return advance;
  }

  /** Aprova: gera o título a pagar (mesmo padrão de VacationGrantService.approve). */
  async approve(
    companyId: string,
    rootCompanyId: string,
    id: string,
    approvedByUserId: string,
  ) {
    const advance = await this.findOne(companyId, id);

    this.assertDraft(advance.status);

    const account = await this.prisma.chartOfAccount.findFirst({
      where: { companyId: rootCompanyId, code: SALARY_ADVANCE_CHART_ACCOUNT_CODE },
    });

    const label = `ADT-${String(advance.number).padStart(6, '0')}`;
    const today = new Date();

    await this.prisma.$transaction(async (tx) => {
      await this.financialEntriesService.createFromDocument(
        tx,
        {
          companyId,
          type: FinancialEntryType.PAYABLE,
          employeeId: advance.employeeId,
          amount: Number(advance.amount),
          issueDate: today,
          dueDate: today,
          documentNumber: label,
          documentType: FinancialDocumentType.OUTRO,
          paymentMethod: advance.employee.paymentMethod,
          chartOfAccountId: account?.id,
          salaryAdvanceId: advance.id,
          observation: `Adiantamento salarial ${label}.`,
        },
        approvedByUserId,
      );

      await tx.salaryAdvance.update({
        where: { id: advance.id },
        data: { status: PayrollStatus.APPROVED, approvedAt: new Date(), approvedByUserId },
      });
    });

    return this.findOne(companyId, id);
  }

  /** Estorna a aprovação: volta pra rascunho e apaga o título gerado. */
  async reverse(companyId: string, id: string) {
    const advance = await this.findOne(companyId, id);

    if (advance.status !== PayrollStatus.APPROVED) {
      throw new BadRequestException('Somente adiantamentos aprovados podem ser estornados.');
    }

    if (advance.financialEntry?.status === 'PAID') {
      throw new BadRequestException(
        'Este adiantamento tem título já baixado — estorne a baixa antes de estornar a aprovação.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.financialEntry.deleteMany({ where: { salaryAdvanceId: advance.id } });

      await tx.salaryAdvance.update({
        where: { id: advance.id },
        data: { status: PayrollStatus.DRAFT, approvedAt: null, approvedByUserId: null },
      });
    });

    return this.findOne(companyId, id);
  }

  async cancel(companyId: string, id: string) {
    const advance = await this.findOne(companyId, id);

    if (advance.status === PayrollStatus.CANCELLED) {
      throw new BadRequestException('Este adiantamento já está cancelado.');
    }

    if (advance.status === PayrollStatus.APPROVED && advance.financialEntry?.status === 'PAID') {
      throw new BadRequestException(
        'Este adiantamento tem título já baixado — estorne a baixa antes de cancelar.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      if (advance.financialEntry) {
        await tx.financialEntry.update({
          where: { id: advance.financialEntry.id },
          data: { status: 'CANCELLED' },
        });
      }

      return tx.salaryAdvance.update({
        where: { id },
        data: { status: PayrollStatus.CANCELLED },
        include: {
          employee: { select: { id: true, name: true } },
          financialEntry: true,
        },
      });
    });
  }

  async remove(companyId: string, id: string) {
    const advance = await this.findOne(companyId, id);

    if (advance.status !== PayrollStatus.CANCELLED) {
      throw new BadRequestException('Somente adiantamentos cancelados podem ser excluídos.');
    }

    await this.prisma.salaryAdvance.delete({ where: { id: advance.id } });
  }

  private assertDraft(status: PayrollStatus) {
    if (status !== PayrollStatus.DRAFT) {
      throw new BadRequestException('Somente adiantamentos em rascunho podem ser alterados.');
    }
  }
}
