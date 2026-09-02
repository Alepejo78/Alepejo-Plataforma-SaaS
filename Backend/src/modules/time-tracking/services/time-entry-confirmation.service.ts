import * as crypto from 'crypto';

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { PayrollConfirmationStatus } from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';
import { EmailNotificationsService } from '../../notifications/services/email-notifications.service';
import { WhatsappNotificationsService } from '../../notifications/services/whatsapp-notifications.service';
import { PayslipPdfService, type TimeReportDay } from '../../payroll/services/payslip-pdf.service';

import { TimeTrackingService } from './time-tracking.service';

const CONFIRMATION_TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000;

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function timeLabel(value: Date | null): string {
  if (!value) {
    return '—';
  }

  return new Date(value).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });
}

function dateLabel(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

function minutesToLabel(minutes: number): string {
  const sign = minutes < 0 ? '-' : '';
  const abs = Math.abs(Math.round(minutes));

  return `${sign}${Math.floor(abs / 60)}h${String(abs % 60).padStart(2, '0')}`;
}

function monthRange(year: number, month: number) {
  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = new Date(Date.UTC(year, month, 0));

  return {
    fromStr: from.toISOString().slice(0, 10),
    toStr: to.toISOString().slice(0, 10),
  };
}

/**
 * Confirmação digital mensal do ponto — mesmo mecanismo de
 * Payroll/Vacation/ThirteenthSalary (ver VacationConfirmationService),
 * mas sem título financeiro atrelado: ponto não gera título, o
 * disparo é sempre manual (RH decide quando o mês "fechou" pra
 * conferência), individual ou em massa.
 */
@Injectable()
export class TimeEntryConfirmationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timeTracking: TimeTrackingService,
    private readonly emailNotifications: EmailNotificationsService,
    private readonly whatsappNotifications: WhatsappNotificationsService,
    private readonly payslipPdf: PayslipPdfService,
  ) {}

  private async findEmployee(companyId: string, employeeId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, companyId },
      select: {
        id: true,
        name: true,
        email: true,
        mobile: true,
        employeeNumber: true,
        cpf: true,
        jobFunction: { select: { name: true } },
      },
    });

    if (!employee) {
      throw new NotFoundException('Colaborador não encontrado.');
    }

    return employee;
  }

  private async findOrCreateConfirmation(companyId: string, employeeId: string, year: number, month: number) {
    return this.prisma.timeEntryMonthlyConfirmation.upsert({
      where: {
        companyId_employeeId_year_month: { companyId, employeeId, year, month },
      },
      update: {},
      create: { companyId, employeeId, year, month },
    });
  }

  async findAll(companyId: string, filter: { year?: number; month?: number }) {
    return this.prisma.timeEntryMonthlyConfirmation.findMany({
      where: {
        companyId,
        ...(filter.year && { year: filter.year }),
        ...(filter.month && { month: filter.month }),
      },
      include: { employee: { select: { id: true, name: true, employeeNumber: true } } },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
  }

  async send(companyId: string, employeeId: string, year: number, month: number) {
    const employee = await this.findEmployee(companyId, employeeId);
    const confirmation = await this.findOrCreateConfirmation(companyId, employeeId, year, month);

    if (confirmation.confirmationStatus === PayrollConfirmationStatus.CONFIRMADO) {
      throw new BadRequestException('Este mês já está confirmado.');
    }

    if (!employee.email && !employee.mobile) {
      throw new BadRequestException(
        'Este colaborador não tem e-mail nem celular cadastrado — não há como enviar o link de confirmação.',
      );
    }

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + CONFIRMATION_TOKEN_TTL_MS);

    await this.prisma.timeEntryMonthlyConfirmation.update({
      where: { id: confirmation.id },
      data: {
        confirmationTokenHash: tokenHash,
        confirmationTokenExpiresAt: expiresAt,
        confirmationSentAt: new Date(),
      },
    });

    return this.dispatch(companyId, confirmation.id, employee, year, month, token);
  }

  /** Envia pra todo colaborador ativo com pelo menos uma batida no mês — falha individual não trava os demais. */
  async sendBulk(companyId: string, year: number, month: number) {
    const { fromStr, toStr } = monthRange(year, month);

    const summaries = await this.timeTracking.getDaySummaries(companyId, {
      from: fromStr,
      to: toStr,
    });

    const employeeIds = [...new Set(summaries.map((s) => s.employeeId))];

    let sent = 0;
    const failed: { employeeId: string; employeeName: string; reason: string }[] = [];

    for (const employeeId of employeeIds) {
      try {
        await this.send(companyId, employeeId, year, month);
        sent++;
      } catch (err) {
        const name = summaries.find((s) => s.employeeId === employeeId)?.employeeName ?? employeeId;

        failed.push({
          employeeId,
          employeeName: name,
          reason: err instanceof Error ? err.message : 'Falha desconhecida',
        });
      }
    }

    return { total: employeeIds.length, sent, failed };
  }

  async confirm(companyId: string, id: string, confirmedById: string) {
    const confirmation = await this.prisma.timeEntryMonthlyConfirmation.findFirst({
      where: { id, companyId },
    });

    if (!confirmation) {
      throw new NotFoundException('Confirmação não encontrada.');
    }

    if (confirmation.confirmationStatus === PayrollConfirmationStatus.CONFIRMADO) {
      throw new BadRequestException('Este mês já está confirmado.');
    }

    return this.prisma.timeEntryMonthlyConfirmation.update({
      where: { id: confirmation.id },
      data: {
        confirmationStatus: PayrollConfirmationStatus.CONFIRMADO,
        confirmedAt: new Date(),
        confirmedById,
      },
    });
  }

  /** Autoatendimento — o colaborador confirma o próprio mês, sem precisar que o RH tenha enviado antes. */
  async confirmMine(companyId: string, employeeId: string, year: number, month: number, confirmedByUserId: string) {
    const confirmation = await this.findOrCreateConfirmation(companyId, employeeId, year, month);

    return this.confirm(companyId, confirmation.id, confirmedByUserId);
  }

  private async getMonthSummaries(companyId: string, employeeId: string, year: number, month: number) {
    const { fromStr, toStr } = monthRange(year, month);

    return this.timeTracking.getDaySummaries(companyId, {
      employeeId,
      from: fromStr,
      to: toStr,
    });
  }

  private toTimeReportDays(summaries: Awaited<ReturnType<typeof this.getMonthSummaries>>): TimeReportDay[] {
    return [...summaries]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((s) => ({
        dateLabel: dateLabel(s.date),
        start: timeLabel(s.slots.start),
        breakStart: timeLabel(s.slots.breakStart),
        breakEnd: timeLabel(s.slots.breakEnd),
        end: timeLabel(s.slots.end),
        workedLabel: minutesToLabel(s.workedMinutes),
        extraLabel: s.extraMinutes > 0 ? minutesToLabel(s.extraMinutes) : '—',
      }));
  }

  private async dispatch(
    companyId: string,
    confirmationId: string,
    employee: Awaited<ReturnType<typeof this.findEmployee>>,
    year: number,
    month: number,
    token: string,
  ) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    const companyName = company?.tradeName || company?.legalName || '';

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    const link = `${frontendUrl}/confirmar-ponto?id=${confirmationId}&token=${token}`;

    const summaries = await this.getMonthSummaries(companyId, employee.id, year, month);
    const days = this.toTimeReportDays(summaries);
    const totalExtraMinutes = summaries.reduce((sum, s) => sum + s.extraMinutes, 0);

    const pdf = await this.payslipPdf
      .generateTimeReport(
        {
          title: 'Confirmação de Ponto',
          periodLabel: `Período: ${MONTH_NAMES[month - 1]}/${year}`,
          employee,
          days,
          footerFields: [
            { label: 'Total de horas extras no mês', value: minutesToLabel(totalExtraMinutes) },
            { label: 'Dias com registro', value: String(days.length) },
          ],
        },
        company,
      )
      .catch(() => null);

    const channels: string[] = [];

    if (employee.email) {
      const sentEmail = await this.emailNotifications.send(
        companyId,
        employee.email,
        `Confirmação do ponto de ${MONTH_NAMES[month - 1]}/${year} — ${companyName}`,
        `<p>Olá, ${employee.name},</p>
<p>O ponto de ${MONTH_NAMES[month - 1]}/${year} está disponível pra conferência, gerado por <strong>${companyName}</strong>. Clique no botão abaixo pra ver o extrato do mês e confirmar que está certo:</p>
<p style="text-align: center; margin: 24px 0;">
  <a href="${link}" style="background: #2563eb; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Ver ponto e confirmar</a>
</p>
<p style="font-size: 13px; color: #666;">Se o botão não funcionar, copie e cole este link no navegador:<br><a href="${link}">${link}</a></p>`,
        pdf
          ? [{ filename: `ponto-${year}-${String(month).padStart(2, '0')}.pdf`, content: pdf, contentType: 'application/pdf' }]
          : undefined,
      );

      if (sentEmail) {
        channels.push('email');
      }
    }

    if (employee.mobile) {
      const sentWhatsapp = await this.whatsappNotifications.send(
        companyId,
        employee.mobile,
        `Olá, ${employee.name}! O ponto de ${MONTH_NAMES[month - 1]}/${year} (${companyName}) está disponível pra conferência. Confira e confirme neste link: ${link}`,
      );

      if (sentWhatsapp) {
        channels.push('whatsapp');
      }
    }

    return { sent: channels.length > 0, channels };
  }

  private async validatePublicToken(id: string, token: string) {
    const confirmation = await this.prisma.timeEntryMonthlyConfirmation.findFirst({
      where: { id },
      include: { employee: { select: { id: true, name: true } } },
    });

    if (
      !confirmation ||
      !confirmation.confirmationTokenHash ||
      !confirmation.confirmationTokenExpiresAt ||
      confirmation.confirmationTokenExpiresAt < new Date()
    ) {
      throw new BadRequestException('Link de confirmação inválido ou expirado. Peça pro RH enviar um novo.');
    }

    if (hashToken(token) !== confirmation.confirmationTokenHash) {
      throw new BadRequestException('Link de confirmação inválido ou expirado. Peça pro RH enviar um novo.');
    }

    return confirmation;
  }

  async getPublicInfo(id: string, token: string) {
    const confirmation = await this.validatePublicToken(id, token);

    const company = await this.prisma.company.findUnique({
      where: { id: confirmation.companyId },
      select: { tradeName: true, legalName: true, logo: true, brandingLogoLightEnabled: true },
    });

    const summaries = await this.getMonthSummaries(
      confirmation.companyId,
      confirmation.employeeId,
      confirmation.year,
      confirmation.month,
    );
    const days = this.toTimeReportDays(summaries);

    return {
      employeeName: confirmation.employee.name,
      companyName: company?.tradeName || company?.legalName || '',
      companyLogo: company?.brandingLogoLightEnabled ? company.logo : null,
      year: confirmation.year,
      month: confirmation.month,
      days,
      status: confirmation.confirmationStatus,
    };
  }

  async confirmPublic(id: string, token: string) {
    await this.validatePublicToken(id, token);

    await this.prisma.timeEntryMonthlyConfirmation.update({
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
