import * as crypto from 'crypto';

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PayrollConfirmationStatus } from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';
import { EmailNotificationsService } from '../../notifications/services/email-notifications.service';
import { WhatsappNotificationsService } from '../../notifications/services/whatsapp-notifications.service';

import { PayslipPdfService } from './payslip-pdf.service';

const CONFIRMATION_TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000;

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Confirmação digital de recebimento do recibo de 13º salário — mesmo
 * mecanismo de `PayrollConfirmationService`, adaptado pra
 * `ThirteenthSalaryItem` (item dentro de um lote `ThirteenthSalary`
 * por ano/parcela, mesma relação payroll→payrollItem).
 */
@Injectable()
export class ThirteenthConfirmationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailNotifications: EmailNotificationsService,
    private readonly whatsappNotifications: WhatsappNotificationsService,
    private readonly payslipPdf: PayslipPdfService,
  ) {}

  private async findItemScoped(
    companyId: string,
    thirteenthSalaryId: string,
    itemId: string,
  ) {
    const item = await this.prisma.thirteenthSalaryItem.findFirst({
      where: { id: itemId, thirteenthSalaryId, thirteenthSalary: { companyId } },
      include: {
        thirteenthSalary: { select: { companyId: true, year: true, installment: true } },
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
            mobile: true,
            employeeNumber: true,
            cpf: true,
            admissionDate: true,
            bankName: true,
            bankAgency: true,
            bankAccount: true,
            jobFunction: { select: { name: true } },
          },
        },
        lines: { orderBy: { sortOrder: 'asc' } },
        financialEntry: { select: { status: true, dueDate: true } },
      },
    });

    if (!item) {
      throw new NotFoundException('Item do 13º salário não encontrado.');
    }

    return item;
  }

  /** Confirmação manual — RH confirma na tela que o colaborador recebeu. */
  async confirm(
    companyId: string,
    thirteenthSalaryId: string,
    itemId: string,
    confirmedById: string,
  ) {
    const item = await this.findItemScoped(companyId, thirteenthSalaryId, itemId);

    return this.applyConfirm(item, confirmedById);
  }

  /** Autoatendimento (Meu Holerite) — o próprio colaborador confirma o recebimento. */
  async confirmMine(
    companyId: string,
    employeeId: string,
    itemId: string,
    confirmedByUserId: string,
  ) {
    const item = await this.prisma.thirteenthSalaryItem.findFirst({
      where: { id: itemId, employeeId, thirteenthSalary: { companyId } },
      include: {
        financialEntry: { select: { status: true, dueDate: true } },
      },
    });

    if (!item) {
      throw new NotFoundException('Recibo de 13º não encontrado.');
    }

    return this.applyConfirm(item, confirmedByUserId);
  }

  private async applyConfirm(
    item: { id: string; confirmationStatus: PayrollConfirmationStatus; financialEntry: { status: string } | null },
    confirmedById: string,
  ) {
    if (item.confirmationStatus === PayrollConfirmationStatus.CONFIRMADO) {
      throw new BadRequestException('Este recibo já está confirmado.');
    }

    if (item.financialEntry?.status !== 'PAID') {
      throw new BadRequestException(
        'Só é possível confirmar o recebimento depois que o pagamento for baixado no Financeiro.',
      );
    }

    return this.prisma.thirteenthSalaryItem.update({
      where: { id: item.id },
      data: {
        confirmationStatus: PayrollConfirmationStatus.CONFIRMADO,
        confirmedAt: new Date(),
        confirmedById,
      },
    });
  }

  /** Gera (ou renova) o link e manda por e-mail e/ou WhatsApp. */
  async sendConfirmation(companyId: string, thirteenthSalaryId: string, itemId: string) {
    const item = await this.findItemScoped(companyId, thirteenthSalaryId, itemId);

    if (item.confirmationStatus === PayrollConfirmationStatus.CONFIRMADO) {
      throw new BadRequestException('Este recibo já está confirmado.');
    }

    if (item.financialEntry?.status !== 'PAID') {
      throw new BadRequestException(
        'O envio do recibo só é liberado depois que o pagamento for baixado no Financeiro.',
      );
    }

    const employee = item.employee;

    if (!employee.email && !employee.mobile) {
      throw new BadRequestException(
        'Este colaborador não tem e-mail nem celular cadastrado — não há como enviar o link de confirmação.',
      );
    }

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + CONFIRMATION_TOKEN_TTL_MS);

    await this.prisma.thirteenthSalaryItem.update({
      where: { id: item.id },
      data: {
        confirmationTokenHash: tokenHash,
        confirmationTokenExpiresAt: expiresAt,
        confirmationSentAt: new Date(),
      },
    });

    return this.dispatch(companyId, item, token);
  }

  /** Best-effort, sem lançar — usado pelo disparo automático (baixa do título). */
  async sendConfirmationBestEffort(
    companyId: string,
    thirteenthSalaryId: string,
    itemId: string,
  ) {
    try {
      await this.sendConfirmation(companyId, thirteenthSalaryId, itemId);
    } catch {
      // Sem e-mail/celular cadastrado, ou já confirmado — nada a fazer.
    }
  }

  /** Mesma coisa, mas só a partir do id do item — usado por `FinancialEntriesService.settle()`. */
  async sendConfirmationBestEffortByItemId(itemId: string) {
    const item = await this.prisma.thirteenthSalaryItem.findUnique({
      where: { id: itemId },
      select: { thirteenthSalaryId: true, thirteenthSalary: { select: { companyId: true } } },
    });

    if (!item) {
      return;
    }

    await this.sendConfirmationBestEffort(
      item.thirteenthSalary.companyId,
      item.thirteenthSalaryId,
      itemId,
    );
  }

  private async dispatch(
    companyId: string,
    item: Awaited<ReturnType<typeof this.findItemScoped>>,
    token: string,
  ) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    const companyName = company?.tradeName || company?.legalName || '';
    const label = `13º salário — ${item.thirteenthSalary.installment}ª parcela/${item.thirteenthSalary.year}`;

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    const link = `${frontendUrl}/confirmar-13?id=${item.thirteenthSalaryId}&itemId=${item.id}&token=${token}`;

    const pdf = await this.payslipPdf
      .generate(
        {
          title: `Demonstrativo de 13º Salário — ${item.thirteenthSalary.installment}ª Parcela`,
          periodLabel: `Ano: ${item.thirteenthSalary.year}`,
          paymentDateLabel: item.financialEntry?.dueDate
            ? `Data Pagto: ${new Date(item.financialEntry.dueDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}`
            : undefined,
          employee: item.employee,
          baseSalary: Number(item.baseSalary),
          lines: item.lines,
          footerFields: [
            { label: 'Base I.N.S.S.', value: Number(item.inssBase).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) },
            { label: 'F.G.T.S. do Período', value: Number(item.employerFgtsAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) },
            { label: 'Base I.R.R.F. 13º', value: Number(item.irrfBase).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) },
            { label: 'Avos', value: `${item.monthsWorked}/12` },
            { label: '1ª Parcela Já Paga', value: Number(item.previousInstallmentAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) },
          ],
        },
        company,
      )
      .catch(() => null);

    const channels: string[] = [];
    const employee = item.employee;

    if (employee.email) {
      const sent = await this.emailNotifications.send(
        companyId,
        employee.email,
        `Recibo de 13º salário disponível — ${companyName}`,
        `<p>Olá, ${employee.name},</p>
<p>Seu recibo de ${label} já está disponível, gerado por <strong>${companyName}</strong>. Clique no botão abaixo pra ver o resumo e confirmar que recebeu:</p>
<p style="text-align: center; margin: 24px 0;">
  <a href="${link}" style="background: #2563eb; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Ver recibo e confirmar</a>
</p>
<p style="font-size: 13px; color: #666;">Se o botão não funcionar, copie e cole este link no navegador:<br><a href="${link}">${link}</a></p>`,
        pdf
          ? [
              {
                filename: `13-salario-${item.thirteenthSalary.year}-${item.thirteenthSalary.installment}.pdf`,
                content: pdf,
                contentType: 'application/pdf',
              },
            ]
          : undefined,
      );

      if (sent) {
        channels.push('email');
      }
    }

    if (employee.mobile) {
      const sent = await this.whatsappNotifications.send(
        companyId,
        employee.mobile,
        `Olá, ${employee.name}! Seu recibo de ${label} (${companyName}) já está disponível. Confira e confirme neste link: ${link}`,
      );

      if (sent) {
        channels.push('whatsapp');
      }
    }

    return { sent: channels.length > 0, channels };
  }

  private async validatePublicToken(thirteenthSalaryId: string, itemId: string, token: string) {
    const item = await this.prisma.thirteenthSalaryItem.findFirst({
      where: { id: itemId, thirteenthSalaryId },
      include: {
        thirteenthSalary: { select: { companyId: true, year: true, installment: true } },
        employee: { select: { id: true, name: true } },
      },
    });

    if (
      !item ||
      !item.confirmationTokenHash ||
      !item.confirmationTokenExpiresAt ||
      item.confirmationTokenExpiresAt < new Date()
    ) {
      throw new BadRequestException(
        'Link de confirmação inválido ou expirado. Peça pro RH enviar um novo.',
      );
    }

    if (hashToken(token) !== item.confirmationTokenHash) {
      throw new BadRequestException(
        'Link de confirmação inválido ou expirado. Peça pro RH enviar um novo.',
      );
    }

    return item;
  }

  /** Resumo breve pra tela pública (sem login). */
  async getPublicInfo(thirteenthSalaryId: string, itemId: string, token: string) {
    const item = await this.validatePublicToken(thirteenthSalaryId, itemId, token);

    const company = await this.prisma.company.findUnique({
      where: { id: item.thirteenthSalary.companyId },
      select: {
        tradeName: true,
        legalName: true,
        logo: true,
        brandingLogoLightEnabled: true,
      },
    });

    return {
      employeeName: item.employee.name,
      companyName: company?.tradeName || company?.legalName || '',
      companyLogo: company?.brandingLogoLightEnabled ? company.logo : null,
      year: item.thirteenthSalary.year,
      installment: item.thirteenthSalary.installment,
      netAmount: Number(item.netAmount),
      status: item.confirmationStatus,
    };
  }

  /** Consumo público do link — o colaborador confirma sem sessão. */
  async confirmPublic(thirteenthSalaryId: string, itemId: string, token: string) {
    await this.validatePublicToken(thirteenthSalaryId, itemId, token);

    await this.prisma.thirteenthSalaryItem.update({
      where: { id: itemId },
      data: {
        confirmationStatus: PayrollConfirmationStatus.CONFIRMADO,
        confirmedAt: new Date(),
        confirmedById: null,
        confirmationTokenHash: null,
        confirmationTokenExpiresAt: null,
      },
    });

    return { success: true };
  }
}
