import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { EmployeeStatus, NotificationType } from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';
import { EmailNotificationsService } from '../../notifications/services/email-notifications.service';
import { WhatsappNotificationsService } from '../../notifications/services/whatsapp-notifications.service';
import { InAppNotificationsService } from '../../in-app-notifications/services/in-app-notifications.service';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const FIXED_EXAM_REMINDER_DAYS = 3;
const DEFAULT_EXAM_REMINDER_DAYS = 7;

/** Meia-noite UTC do dia (mesmo padrão do resto do sistema — ver reconcileExperience/getBirthdays em EmployeesService). */
function utcMidnight(date: Date): number {
  return Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );
}

/**
 * Avisos automáticos diários (exame ocupacional e aniversário),
 * rodando para todas as empresas do sistema — não é escopado por
 * companyId como os outros services (não nasce de uma requisição).
 * Best-effort: cada envio individual nunca lança (ver
 * EmailNotificationsService.send/WhatsappNotificationsService.send),
 * e uma falha num colaborador não impede os demais.
 */
@Injectable()
export class ScheduledNotificationsService {
  private readonly logger = new Logger(
    ScheduledNotificationsService.name,
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailNotifications: EmailNotificationsService,
    private readonly whatsappNotifications: WhatsappNotificationsService,
    private readonly inAppNotifications: InAppNotificationsService,
  ) {}

  @Cron('0 8 * * *', { timeZone: 'America/Sao_Paulo' })
  async runDailyNotifications() {
    this.logger.log('Rodando avisos diários (exames e aniversários)...');

    await this.notifyExamReminders();
    await this.notifyBirthdays();
    await this.reconcileVacationAndLeave();
    await this.notifyHourBankClosing();
    await this.notifyPointClosing();
  }

  /**
   * Desmarca sozinho "em férias"/"afastado" quando a data de fim já
   * passou — é isso que libera o login de novo (AuthService.
   * assertEmployeeCanLogin) sem precisar de ação manual do RH.
   */
  private async reconcileVacationAndLeave() {
    const todayUtc = new Date(utcMidnight(new Date()));

    const [vacationCount, leaveCount] = await Promise.all([
      this.prisma.employee.updateMany({
        where: { onVacation: true, vacationEndDate: { lt: todayUtc } },
        data: { onVacation: false, vacationStartDate: null, vacationDays: null, vacationEndDate: null },
      }),
      this.prisma.employee.updateMany({
        where: { onLeave: true, leaveEndDate: { lt: todayUtc } },
        data: { onLeave: false, leaveStartDate: null, leaveDays: null, leaveEndDate: null },
      }),
    ]);

    if (vacationCount.count > 0 || leaveCount.count > 0) {
      this.logger.log(
        `Reconciliação férias/afastamento: ${vacationCount.count} colaborador(es) voltou(aram) de férias, ${leaveCount.count} voltou(aram) de afastamento.`,
      );
    }
  }

  private async notifyExamReminders() {
    const employees = await this.prisma.employee.findMany({
      where: {
        active: true,
        status: { not: EmployeeStatus.DEMITIDO },
        nextExamDate: { not: null },
      },
      include: { company: true },
    });

    const todayUtc = utcMidnight(new Date());

    for (const employee of employees) {
      if (!employee.email && !employee.mobile) {
        continue;
      }

      const examUtc = utcMidnight(employee.nextExamDate!);
      const daysUntil = Math.round(
        (examUtc - todayUtc) / MS_PER_DAY,
      );

      const reminderDays =
        employee.examReminderDays ?? DEFAULT_EXAM_REMINDER_DAYS;
      const triggerDays = new Set([
        reminderDays,
        FIXED_EXAM_REMINDER_DAYS,
        0,
      ]);

      if (daysUntil < 0 || !triggerDays.has(daysUntil)) {
        continue;
      }

      const companyName =
        employee.company.tradeName ||
        employee.company.legalName;
      const examDateLabel = employee.nextExamDate!.toLocaleDateString(
        'pt-BR',
        { timeZone: 'UTC' },
      );

      const message =
        daysUntil === 0
          ? `Olá, ${employee.name}! Você tem exame ocupacional hoje (${examDateLabel}). Não esqueça!`
          : `Olá, ${employee.name}! Seu exame ocupacional está marcado para ${examDateLabel} (em ${daysUntil} dia${daysUntil === 1 ? '' : 's'}). Não esqueça!`;

      const subject =
        daysUntil === 0
          ? `Você tem exame hoje — ${companyName}`
          : `Lembrete de exame ocupacional — ${companyName}`;

      if (employee.email) {
        void this.emailNotifications.send(
          employee.companyId,
          employee.email,
          subject,
          `<p>${message}</p>`,
        );
      }

      if (employee.mobile) {
        void this.whatsappNotifications.send(
          employee.companyId,
          employee.mobile,
          message,
        );
      }
    }
  }

  private async notifyBirthdays() {
    const employees = await this.prisma.employee.findMany({
      where: {
        active: true,
        status: { not: EmployeeStatus.DEMITIDO },
        birthDate: { not: null },
      },
      include: { company: true },
    });

    const today = new Date();

    for (const employee of employees) {
      const birth = employee.birthDate!;

      if (
        birth.getUTCMonth() !== today.getUTCMonth() ||
        birth.getUTCDate() !== today.getUTCDate()
      ) {
        continue;
      }

      if (!employee.email && !employee.mobile) {
        continue;
      }

      const companyName =
        employee.company.tradeName ||
        employee.company.legalName;
      const message = `Feliz aniversário, ${employee.name}! 🎉 Toda a equipe da ${companyName} deseja um ótimo dia!`;

      if (employee.email) {
        void this.emailNotifications.send(
          employee.companyId,
          employee.email,
          'Feliz aniversário! 🎉',
          `<p>${message}</p>`,
        );
      }

      if (employee.mobile) {
        void this.whatsappNotifications.send(
          employee.companyId,
          employee.mobile,
          message,
        );
      }
    }
  }

  /**
   * Aviso de fechamento do banco de horas — todo dia, a partir de
   * `hourBankClosingReminderDays` antes de `hourBankClosingDate`
   * (config por empresa, `PayrollSettings`). Some sozinho quando a
   * data passa (o `dedupeKey` de hoje simplesmente para de ser
   * gerado) — não precisa `clearIfUnread`.
   */
  private async notifyHourBankClosing() {
    const employees = await this.prisma.employee.findMany({
      where: {
        active: true,
        status: { not: EmployeeStatus.DEMITIDO },
        hourBankEnabled: true,
        hourBankClosingDate: { not: null },
      },
      include: { company: true },
    });

    if (employees.length === 0) {
      return;
    }

    const companyIds = [...new Set(employees.map((e) => e.companyId))];
    const settingsList = await this.prisma.payrollSettings.findMany({
      where: { companyId: { in: companyIds } },
    });
    const settingsByCompany = new Map(
      settingsList.map((s) => [s.companyId, s]),
    );

    const todayUtc = utcMidnight(new Date());
    const todayStr = new Date(todayUtc).toISOString().slice(0, 10);

    for (const employee of employees) {
      if (!employee.userId && !employee.email && !employee.mobile) {
        continue;
      }

      const reminderDays =
        settingsByCompany.get(employee.companyId)
          ?.hourBankClosingReminderDays ?? 7;

      const closingUtc = utcMidnight(employee.hourBankClosingDate!);
      const daysUntil = Math.round(
        (closingUtc - todayUtc) / MS_PER_DAY,
      );

      if (daysUntil < 0 || daysUntil > reminderDays) {
        continue;
      }

      const companyName =
        employee.company.tradeName || employee.company.legalName;
      const closingLabel = employee.hourBankClosingDate!.toLocaleDateString(
        'pt-BR',
        { timeZone: 'UTC' },
      );

      const message =
        daysUntil === 0
          ? `Olá, ${employee.name}! Hoje (${closingLabel}) fecha o seu banco de horas.`
          : `Olá, ${employee.name}! Seu banco de horas fecha em ${closingLabel} (em ${daysUntil} dia${daysUntil === 1 ? '' : 's'}).`;

      if (employee.email) {
        void this.emailNotifications.send(
          employee.companyId,
          employee.email,
          `Fechamento do banco de horas — ${companyName}`,
          `<p>${message}</p>`,
        );
      }

      if (employee.mobile) {
        void this.whatsappNotifications.send(
          employee.companyId,
          employee.mobile,
          message,
        );
      }

      if (employee.userId) {
        void this.inAppNotifications.emit({
          companyId: employee.companyId,
          type: NotificationType.HOUR_BANK_CLOSING,
          dedupeKey: `hour-bank-closing-${employee.id}-${todayStr}`,
          title: 'Fechamento do banco de horas',
          message,
          permissionCode: 'self',
          linkUrl: '/erp/rh/ponto/acompanhamento',
          userId: employee.userId,
        });
      }
    }
  }

  /**
   * Aviso de fechamento do mês do ponto ("regularize seu ponto") —
   * todo colaborador ativo, nos últimos `pointClosingReminderDays`
   * dias do mês, todo dia até o fim do mês OU até a folha daquela
   * competência já existir (o que vier primeiro).
   */
  private async notifyPointClosing() {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth() + 1;
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const daysUntilMonthEnd = lastDay - now.getUTCDate();

    const employees = await this.prisma.employee.findMany({
      where: { active: true, status: { not: EmployeeStatus.DEMITIDO } },
      include: { company: true },
    });

    if (employees.length === 0) {
      return;
    }

    const companyIds = [...new Set(employees.map((e) => e.companyId))];
    const [settingsList, payrolls] = await Promise.all([
      this.prisma.payrollSettings.findMany({
        where: { companyId: { in: companyIds } },
      }),
      this.prisma.payroll.findMany({
        where: {
          companyId: { in: companyIds },
          competenceYear: year,
          competenceMonth: month,
        },
      }),
    ]);
    const settingsByCompany = new Map(
      settingsList.map((s) => [s.companyId, s]),
    );
    const companiesWithPayroll = new Set(
      payrolls.map((p) => p.companyId),
    );

    const todayStr = new Date(utcMidnight(now)).toISOString().slice(0, 10);

    for (const employee of employees) {
      if (companiesWithPayroll.has(employee.companyId)) {
        continue;
      }

      if (!employee.userId && !employee.email && !employee.mobile) {
        continue;
      }

      const reminderDays =
        settingsByCompany.get(employee.companyId)
          ?.pointClosingReminderDays ?? 5;

      if (daysUntilMonthEnd > reminderDays) {
        continue;
      }

      const companyName =
        employee.company.tradeName || employee.company.legalName;
      const message = `Olá, ${employee.name}! O mês de ponto está fechando — regularize suas batidas antes do fechamento.`;

      if (employee.email) {
        void this.emailNotifications.send(
          employee.companyId,
          employee.email,
          `Regularize seu ponto — ${companyName}`,
          `<p>${message}</p>`,
        );
      }

      if (employee.mobile) {
        void this.whatsappNotifications.send(
          employee.companyId,
          employee.mobile,
          message,
        );
      }

      if (employee.userId) {
        void this.inAppNotifications.emit({
          companyId: employee.companyId,
          type: NotificationType.POINT_MONTH_CLOSING,
          dedupeKey: `point-month-closing-${employee.id}-${todayStr}`,
          title: 'Regularize seu ponto',
          message,
          permissionCode: 'self',
          linkUrl: '/erp/rh/ponto/acompanhamento',
          userId: employee.userId,
        });
      }
    }
  }
}
