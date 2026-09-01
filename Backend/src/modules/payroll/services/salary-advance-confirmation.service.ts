import * as crypto from 'crypto';

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PayrollConfirmationStatus, PayrollLineType } from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';
import { EmailNotificationsService } from '../../notifications/services/email-notifications.service';
import { WhatsappNotificationsService } from '../../notifications/services/whatsapp-notifications.service';

import { PayslipPdfService } from './payslip-pdf.service';

const CONFIRMATION_TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000;

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function formatDate(value: Date | null | undefined): string {
  if (!value) {
    return '—';
  }

  return new Date(value).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

/**
 * Confirmação digital de recebimento do adiantamento salarial —
 * mesmo mecanismo de `PayrollConfirmationService`, bem mais simples
 * (um valor fixo, sem cálculo de INSS/IRRF).
 */
@Injectable()
export class SalaryAdvanceConfirmationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailNotifications: EmailNotificationsService,
    private readonly whatsappNotifications: WhatsappNotificationsService,
    private readonly payslipPdf: PayslipPdfService,
  ) {}

  private async findScoped(companyId: string, id: string) {
    const advance = await this.prisma.salaryAdvance.findFirst({
      where: { id, companyId },
      include: {
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
        financialEntry: { select: { status: true, dueDate: true } },
      },
    });

    if (!advance) {
      throw new NotFoundException('Adiantamento salarial não encontrado.');
    }

    return advance;
  }

  /** Confirmação manual — RH confirma na tela que o colaborador recebeu. */
  async confirm(companyId: string, id: string, confirmedById: string) {
    const advance = await this.findScoped(companyId, id);

    if (advance.confirmationStatus === PayrollConfirmationStatus.CONFIRMADO) {
      throw new BadRequestException('Este adiantamento já está confirmado.');
    }

    if (advance.financialEntry?.status !== 'PAID') {
      throw new BadRequestException(
        'Só é possível confirmar o recebimento depois que o pagamento for baixado no Financeiro.',
      );
    }

    return this.prisma.salaryAdvance.update({
      where: { id: advance.id },
      data: {
        confirmationStatus: PayrollConfirmationStatus.CONFIRMADO,
        confirmedAt: new Date(),
        confirmedById,
      },
    });
  }

  /** Gera (ou renova) o link e manda por e-mail e/ou WhatsApp. */
  async sendConfirmation(companyId: string, id: string) {
    const advance = await this.findScoped(companyId, id);

    if (advance.confirmationStatus === PayrollConfirmationStatus.CONFIRMADO) {
      throw new BadRequestException('Este adiantamento já está confirmado.');
    }

    if (advance.financialEntry?.status !== 'PAID') {
      throw new BadRequestException(
        'O envio da confirmação só é liberado depois que o pagamento for baixado no Financeiro.',
      );
    }

    const employee = advance.employee;

    if (!employee.email && !employee.mobile) {
      throw new BadRequestException(
        'Este colaborador não tem e-mail nem celular cadastrado — não há como enviar o link de confirmação.',
      );
    }

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + CONFIRMATION_TOKEN_TTL_MS);

    await this.prisma.salaryAdvance.update({
      where: { id: advance.id },
      data: {
        confirmationTokenHash: tokenHash,
        confirmationTokenExpiresAt: expiresAt,
        confirmationSentAt: new Date(),
      },
    });

    return this.dispatch(companyId, advance, token);
  }

  /** Best-effort, sem lançar — usado pelo disparo automático (baixa do título). */
  async sendConfirmationBestEffort(companyId: string, id: string) {
    try {
      await this.sendConfirmation(companyId, id);
    } catch {
      // Sem e-mail/celular cadastrado, ou já confirmado — nada a fazer.
    }
  }

  /** Mesma coisa, mas só a partir do id do adiantamento — usado por `FinancialEntriesService.settle()`. */
  async sendConfirmationBestEffortBySalaryAdvanceId(id: string) {
    const advance = await this.prisma.salaryAdvance.findUnique({
      where: { id },
      select: { companyId: true },
    });

    if (!advance) {
      return;
    }

    await this.sendConfirmationBestEffort(advance.companyId, id);
  }

  private async dispatch(
    companyId: string,
    advance: Awaited<ReturnType<typeof this.findScoped>>,
    token: string,
  ) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    const companyName = company?.tradeName || company?.legalName || '';
    const label = `ADT-${String(advance.number).padStart(6, '0')}`;

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    const link = `${frontendUrl}/confirmar-adiantamento?id=${advance.id}&token=${token}`;

    const pdf = await this.payslipPdf
      .generate(
        {
          title: 'Recibo de Adiantamento Salarial',
          periodLabel: `Solicitado em: ${formatDate(advance.requestDate)}`,
          paymentDateLabel: advance.financialEntry?.dueDate
            ? `Data Pagto: ${formatDate(advance.financialEntry.dueDate)}`
            : undefined,
          employee: advance.employee,
          lines: [
            {
              type: PayrollLineType.PROVENTO,
              code: 'ADIANTAMENTO',
              description: 'Adiantamento salarial',
              referenceValue: null,
              amount: advance.amount,
            },
          ],
          footerFields: [
            { label: 'Parcelas previstas p/ desconto', value: String(advance.installments) },
          ],
        },
        company,
      )
      .catch(() => null);

    const channels: string[] = [];
    const employee = advance.employee;

    if (employee.email) {
      const sent = await this.emailNotifications.send(
        companyId,
        employee.email,
        `Adiantamento salarial disponível — ${companyName}`,
        `<p>Olá, ${employee.name},</p>
<p>Seu adiantamento salarial (${label}) já está disponível, gerado por <strong>${companyName}</strong>. Clique no botão abaixo pra ver o resumo e confirmar que recebeu:</p>
<p style="text-align: center; margin: 24px 0;">
  <a href="${link}" style="background: #2563eb; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Ver recibo e confirmar</a>
</p>
<p style="font-size: 13px; color: #666;">Se o botão não funcionar, copie e cole este link no navegador:<br><a href="${link}">${link}</a></p>`,
        pdf
          ? [
              {
                filename: `adiantamento-${label}.pdf`,
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
        `Olá, ${employee.name}! Seu adiantamento salarial (${companyName}) já está disponível. Confira e confirme neste link: ${link}`,
      );

      if (sent) {
        channels.push('whatsapp');
      }
    }

    return { sent: channels.length > 0, channels };
  }

  private async validatePublicToken(id: string, token: string) {
    const advance = await this.prisma.salaryAdvance.findFirst({
      where: { id },
      include: { employee: { select: { id: true, name: true } } },
    });

    if (
      !advance ||
      !advance.confirmationTokenHash ||
      !advance.confirmationTokenExpiresAt ||
      advance.confirmationTokenExpiresAt < new Date()
    ) {
      throw new BadRequestException(
        'Link de confirmação inválido ou expirado. Peça pro RH enviar um novo.',
      );
    }

    if (hashToken(token) !== advance.confirmationTokenHash) {
      throw new BadRequestException(
        'Link de confirmação inválido ou expirado. Peça pro RH enviar um novo.',
      );
    }

    return advance;
  }

  /** Resumo breve pra tela pública (sem login). */
  async getPublicInfo(id: string, token: string) {
    const advance = await this.validatePublicToken(id, token);

    const company = await this.prisma.company.findUnique({
      where: { id: advance.companyId },
      select: {
        tradeName: true,
        legalName: true,
        logo: true,
        brandingLogoLightEnabled: true,
      },
    });

    return {
      employeeName: advance.employee.name,
      companyName: company?.tradeName || company?.legalName || '',
      companyLogo: company?.brandingLogoLightEnabled ? company.logo : null,
      amount: Number(advance.amount),
      installments: advance.installments,
      requestDate: advance.requestDate,
      status: advance.confirmationStatus,
    };
  }

  /** Consumo público do link — o colaborador confirma sem sessão. */
  async confirmPublic(id: string, token: string) {
    await this.validatePublicToken(id, token);

    await this.prisma.salaryAdvance.update({
      where: { id },
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
