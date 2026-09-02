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

function formatDate(value: Date | null | undefined): string {
  if (!value) {
    return '—';
  }

  return new Date(value).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

/**
 * Confirmação digital de recebimento do recibo de férias — mesmo
 * mecanismo de `PayrollConfirmationService` (ver comentário lá),
 * adaptado pra `VacationGrant` (um gozo por colaborador, sem "itens"
 * dentro de um lote como a folha mensal).
 */
@Injectable()
export class VacationConfirmationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailNotifications: EmailNotificationsService,
    private readonly whatsappNotifications: WhatsappNotificationsService,
    private readonly payslipPdf: PayslipPdfService,
  ) {}

  private async findScoped(companyId: string, id: string) {
    const grant = await this.prisma.vacationGrant.findFirst({
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
        lines: { orderBy: { sortOrder: 'asc' } },
        financialEntry: { select: { status: true, dueDate: true } },
      },
    });

    if (!grant) {
      throw new NotFoundException('Gozo de férias não encontrado.');
    }

    return grant;
  }

  /** Confirmação manual — RH confirma na tela que o colaborador recebeu. */
  async confirm(companyId: string, id: string, confirmedById: string) {
    const grant = await this.findScoped(companyId, id);

    return this.applyConfirm(grant, confirmedById);
  }

  /** Autoatendimento (Meu Holerite) — o próprio colaborador confirma o recebimento. */
  async confirmMine(
    companyId: string,
    employeeId: string,
    id: string,
    confirmedByUserId: string,
  ) {
    const grant = await this.prisma.vacationGrant.findFirst({
      where: { id, employeeId, companyId },
      include: {
        financialEntry: { select: { status: true, dueDate: true } },
      },
    });

    if (!grant) {
      throw new NotFoundException('Gozo de férias não encontrado.');
    }

    return this.applyConfirm(grant, confirmedByUserId);
  }

  private async applyConfirm(
    grant: { id: string; confirmationStatus: PayrollConfirmationStatus; financialEntry: { status: string } | null },
    confirmedById: string,
  ) {
    if (grant.confirmationStatus === PayrollConfirmationStatus.CONFIRMADO) {
      throw new BadRequestException('Este recibo já está confirmado.');
    }

    if (grant.financialEntry?.status !== 'PAID') {
      throw new BadRequestException(
        'Só é possível confirmar o recebimento depois que o pagamento for baixado no Financeiro.',
      );
    }

    return this.prisma.vacationGrant.update({
      where: { id: grant.id },
      data: {
        confirmationStatus: PayrollConfirmationStatus.CONFIRMADO,
        confirmedAt: new Date(),
        confirmedById,
      },
    });
  }

  /** Gera (ou renova) o link e manda por e-mail e/ou WhatsApp. */
  async sendConfirmation(companyId: string, id: string) {
    const grant = await this.findScoped(companyId, id);

    if (grant.confirmationStatus === PayrollConfirmationStatus.CONFIRMADO) {
      throw new BadRequestException('Este recibo já está confirmado.');
    }

    if (grant.financialEntry?.status !== 'PAID') {
      throw new BadRequestException(
        'O envio do recibo só é liberado depois que o pagamento for baixado no Financeiro.',
      );
    }

    const employee = grant.employee;

    if (!employee.email && !employee.mobile) {
      throw new BadRequestException(
        'Este colaborador não tem e-mail nem celular cadastrado — não há como enviar o link de confirmação.',
      );
    }

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + CONFIRMATION_TOKEN_TTL_MS);

    await this.prisma.vacationGrant.update({
      where: { id: grant.id },
      data: {
        confirmationTokenHash: tokenHash,
        confirmationTokenExpiresAt: expiresAt,
        confirmationSentAt: new Date(),
      },
    });

    return this.dispatch(companyId, grant, token);
  }

  /** Best-effort, sem lançar — usado pelo disparo automático (baixa do título). */
  async sendConfirmationBestEffort(companyId: string, id: string) {
    try {
      await this.sendConfirmation(companyId, id);
    } catch {
      // Sem e-mail/celular cadastrado, ou já confirmado — nada a fazer.
    }
  }

  /** Mesma coisa, mas só a partir do id do gozo — usado por `FinancialEntriesService.settle()`. */
  async sendConfirmationBestEffortByVacationGrantId(id: string) {
    const grant = await this.prisma.vacationGrant.findUnique({
      where: { id },
      select: { companyId: true },
    });

    if (!grant) {
      return;
    }

    await this.sendConfirmationBestEffort(grant.companyId, id);
  }

  private async dispatch(
    companyId: string,
    grant: Awaited<ReturnType<typeof this.findScoped>>,
    token: string,
  ) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    const companyName = company?.tradeName || company?.legalName || '';

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    const link = `${frontendUrl}/confirmar-ferias?id=${grant.id}&token=${token}`;

    const pdf = await this.payslipPdf
      .generate(
        {
          title: 'Recibo de Férias',
          periodLabel: `Gozo: ${formatDate(grant.startDate)} a ${formatDate(grant.endDate)}`,
          paymentDateLabel: `Retorno: ${formatDate(grant.returnDate)}`,
          employee: grant.employee,
          baseSalary: Number(grant.baseSalary),
          lines: grant.lines,
          footerFields: [
            { label: 'Base I.N.S.S.', value: Number(grant.inssBase).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) },
            { label: 'F.G.T.S. do Período', value: Number(grant.employerFgtsAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) },
            { label: 'Base I.R.R.F.', value: Number(grant.irrfBase).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) },
            { label: 'Dias de Descanso', value: String(grant.days) },
            { label: 'Dias Vendidos (abono)', value: String(grant.soldDays) },
          ],
        },
        company,
      )
      .catch(() => null);

    const channels: string[] = [];
    const employee = grant.employee;

    if (employee.email) {
      const sent = await this.emailNotifications.send(
        companyId,
        employee.email,
        `Recibo de férias disponível — ${companyName}`,
        `<p>Olá, ${employee.name},</p>
<p>Seu recibo de férias (${formatDate(grant.startDate)} a ${formatDate(grant.endDate)}) já está disponível, gerado por <strong>${companyName}</strong>. Clique no botão abaixo pra ver o resumo e confirmar que recebeu:</p>
<p style="text-align: center; margin: 24px 0;">
  <a href="${link}" style="background: #2563eb; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Ver recibo e confirmar</a>
</p>
<p style="font-size: 13px; color: #666;">Se o botão não funcionar, copie e cole este link no navegador:<br><a href="${link}">${link}</a></p>`,
        pdf
          ? [
              {
                filename: `ferias-${grant.number}.pdf`,
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
        `Olá, ${employee.name}! Seu recibo de férias (${companyName}) já está disponível. Confira e confirme neste link: ${link}`,
      );

      if (sent) {
        channels.push('whatsapp');
      }
    }

    return { sent: channels.length > 0, channels };
  }

  private async validatePublicToken(id: string, token: string) {
    const grant = await this.prisma.vacationGrant.findFirst({
      where: { id },
      include: { employee: { select: { id: true, name: true } } },
    });

    if (
      !grant ||
      !grant.confirmationTokenHash ||
      !grant.confirmationTokenExpiresAt ||
      grant.confirmationTokenExpiresAt < new Date()
    ) {
      throw new BadRequestException(
        'Link de confirmação inválido ou expirado. Peça pro RH enviar um novo.',
      );
    }

    if (hashToken(token) !== grant.confirmationTokenHash) {
      throw new BadRequestException(
        'Link de confirmação inválido ou expirado. Peça pro RH enviar um novo.',
      );
    }

    return grant;
  }

  /** Resumo breve pra tela pública (sem login). */
  async getPublicInfo(id: string, token: string) {
    const grant = await this.validatePublicToken(id, token);

    const company = await this.prisma.company.findUnique({
      where: { id: grant.companyId },
      select: {
        tradeName: true,
        legalName: true,
        logo: true,
        brandingLogoLightEnabled: true,
      },
    });

    return {
      employeeName: grant.employee.name,
      companyName: company?.tradeName || company?.legalName || '',
      companyLogo: company?.brandingLogoLightEnabled ? company.logo : null,
      startDate: grant.startDate,
      endDate: grant.endDate,
      returnDate: grant.returnDate,
      days: grant.days,
      netAmount: Number(grant.netAmount),
      status: grant.confirmationStatus,
    };
  }

  /** Consumo público do link — o colaborador confirma sem sessão. */
  async confirmPublic(id: string, token: string) {
    await this.validatePublicToken(id, token);

    await this.prisma.vacationGrant.update({
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
