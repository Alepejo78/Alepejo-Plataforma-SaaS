import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import {
  EmployeeStatus,
  PurchaseStatus,
  QuotationStatus,
  SaleStatus,
} from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';
import { calculateAvailableQuantity } from '../../../core/utils/inventory.util';

import { InAppNotificationsService } from './in-app-notifications.service';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const FIXED_EXAM_REMINDER_DAYS = 3;
const DEFAULT_EXAM_REMINDER_DAYS = 7;
const LICENSE_WARNING_DAYS = 7;

function utcMidnight(date: Date): number {
  return Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );
}

function dateLabel(date: Date): string {
  return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

/**
 * Gera as notificações computadas/recorrentes do sino (aniversário,
 * exame, financeiro, aprovação pendente, licença, estoque baixo).
 * Roda pra todas as empresas do sistema de uma vez (não nasce de uma
 * requisição) — mesmo espírito do ScheduledNotificationsService, mas
 * persiste em vez de só disparar e-mail/WhatsApp. Consultas diretas
 * ao Prisma (não pelos services de cada módulo) de propósito: evita
 * dependência circular de módulo (BusinessPartnersModule/EmployeesModule
 * precisam importar este módulo pros hooks de "novo cadastro"; se este
 * módulo importasse de volta os módulos de negócio pra reusar os
 * services, fecharia um ciclo) e evita rodar N queries por empresa
 * quando uma consulta agregada resolve todas de uma vez.
 */
@Injectable()
export class InAppNotificationsCronService {
  private readonly logger = new Logger(
    InAppNotificationsCronService.name,
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: InAppNotificationsService,
  ) {}

  @Cron('*/15 * * * *')
  async runComputedNotifications() {
    this.logger.log('Atualizando notificações computadas do sino...');

    await Promise.all([
      this.checkBirthdaysToday(),
      this.checkExamsDue(),
      this.checkFinancialDueToday(),
      this.checkFinancialOverdue(),
      this.checkApprovalPending(),
      this.checkLicenseExpiring(),
      this.checkLowStock(),
    ]);
  }

  private async checkBirthdaysToday() {
    const employees = await this.prisma.employee.findMany({
      where: {
        active: true,
        status: { not: EmployeeStatus.DEMITIDO },
        birthDate: { not: null },
      },
      include: { company: true },
    });

    const today = new Date();
    const year = today.getUTCFullYear();

    for (const employee of employees) {
      const birth = employee.birthDate!;
      const rootCompanyId =
        employee.company.rootCompanyId ?? employee.company.id;
      const isToday =
        birth.getUTCMonth() === today.getUTCMonth() &&
        birth.getUTCDate() === today.getUTCDate();
      const dedupeKey = `birthday:${employee.id}:${year}`;

      if (!isToday) {
        await this.notifications.clearIfUnread(
          dedupeKey,
          undefined,
          rootCompanyId,
        );
        continue;
      }

      await this.notifications.emit({
        rootCompanyId,
        type: 'BIRTHDAY_TODAY',
        dedupeKey,
        title: 'Aniversariante do dia',
        message: `Hoje é aniversário de ${employee.name}.`,
        permissionCode: 'employee.view',
        linkUrl: '/erp/rh/aniversariantes',
        documentRef: employee.name,
        occurredAt: today,
      });
    }
  }

  private async checkExamsDue() {
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
      const rootCompanyId =
        employee.company.rootCompanyId ?? employee.company.id;
      const examDate = employee.nextExamDate!;
      const examUtc = utcMidnight(examDate);
      const daysUntil = Math.round((examUtc - todayUtc) / MS_PER_DAY);
      const reminderDays =
        employee.examReminderDays ?? DEFAULT_EXAM_REMINDER_DAYS;
      const triggerDays = new Set([
        reminderDays,
        FIXED_EXAM_REMINDER_DAYS,
        0,
      ]);
      const dedupeKey = `exam:${employee.id}:${examDate.toISOString().slice(0, 10)}`;

      if (daysUntil < 0 || !triggerDays.has(daysUntil)) {
        await this.notifications.clearIfUnread(
          dedupeKey,
          undefined,
          rootCompanyId,
        );
        continue;
      }

      const message =
        daysUntil === 0
          ? `Exame ocupacional de ${employee.name} vence hoje (${dateLabel(examDate)}).`
          : `Exame ocupacional de ${employee.name} vence em ${daysUntil} dia${daysUntil === 1 ? '' : 's'} (${dateLabel(examDate)}).`;

      await this.notifications.emit({
        rootCompanyId,
        type: 'EXAM_DUE',
        dedupeKey,
        title: 'Exame a vencer',
        message,
        permissionCode: 'employee.view',
        linkUrl: '/erp/rh/exames',
        documentRef: employee.name,
        occurredAt: new Date(),
      });
    }
  }

  private async checkFinancialDueToday() {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setUTCHours(23, 59, 59, 999);

    const entries = await this.prisma.financialEntry.findMany({
      where: {
        status: 'OPEN',
        dueDate: { gte: start, lte: end },
      },
      include: { partner: true, employee: true },
    });

    for (const entry of entries) {
      const who =
        entry.partner?.tradeName ??
        entry.partner?.legalName ??
        entry.employee?.name ??
        'sem parceiro';
      const acao = entry.type === 'PAYABLE' ? 'pagar' : 'receber';
      const tela =
        entry.type === 'PAYABLE'
          ? '/erp/financeiro/pagar'
          : '/erp/financeiro/receber';

      await this.notifications.emit({
        companyId: entry.companyId,
        type: 'FINANCIAL_DUE_TODAY',
        dedupeKey: `fin-due:${entry.id}:${entry.dueDate.toISOString().slice(0, 10)}`,
        title: 'Vencimento do dia',
        message: `Título a ${acao} de ${who} vence hoje.`,
        permissionCode: 'financial-entry.view',
        linkUrl: tela,
        documentRef: entry.documentNumber ?? undefined,
        occurredAt: new Date(),
      });
    }
  }

  private async checkFinancialOverdue() {
    const entries = await this.prisma.financialEntry.findMany({
      where: {
        status: 'OPEN',
        dueDate: { lt: new Date() },
      },
      include: { partner: true, employee: true },
    });

    for (const entry of entries) {
      const who =
        entry.partner?.tradeName ??
        entry.partner?.legalName ??
        entry.employee?.name ??
        'sem parceiro';
      const acao = entry.type === 'PAYABLE' ? 'pagar' : 'receber';
      const tela =
        entry.type === 'PAYABLE'
          ? '/erp/financeiro/pagar'
          : '/erp/financeiro/receber';

      await this.notifications.emit({
        companyId: entry.companyId,
        type: 'FINANCIAL_OVERDUE',
        dedupeKey: `fin-overdue:${entry.id}`,
        title: 'Fatura vencida',
        message: `Título a ${acao} de ${who} está vencido desde ${dateLabel(entry.dueDate)}.`,
        permissionCode: 'financial-entry.view',
        linkUrl: tela,
        documentRef: entry.documentNumber ?? undefined,
        occurredAt: new Date(),
      });
    }

    // Some sozinha se o título deixou de estar vencido (foi pago/cancelado).
    const stillOpenIds = new Set(entries.map((e) => e.id));
    const previouslyFlagged = await this.prisma.notification.findMany({
      where: { type: 'FINANCIAL_OVERDUE', readAt: null },
    });

    for (const notification of previouslyFlagged) {
      const entryId = notification.dedupeKey.replace('fin-overdue:', '');
      if (!stillOpenIds.has(entryId)) {
        await this.notifications.clearIfUnread(
          notification.dedupeKey,
          notification.companyId || undefined,
          notification.rootCompanyId || undefined,
        );
      }
    }
  }

  private async checkApprovalPending() {
    const [
      quotations,
      purchasesAwaitingApproval,
      purchases,
      salesAwaitingApproval,
      sales,
    ] = await Promise.all([
      this.prisma.quotation.findMany({
        where: { status: QuotationStatus.DRAFT },
      }),
      this.prisma.purchase.findMany({
        where: { status: PurchaseStatus.DRAFT },
        include: { partner: true },
      }),
      this.prisma.purchase.findMany({
        where: { status: PurchaseStatus.APPROVED },
        include: { partner: true },
      }),
      this.prisma.sale.findMany({
        where: { status: SaleStatus.DRAFT },
        include: { partner: true },
      }),
      this.prisma.sale.findMany({
        where: { status: SaleStatus.APPROVED },
        include: { partner: true },
      }),
    ]);

    for (const quotation of quotations) {
      await this.notifications.emit({
        companyId: quotation.companyId,
        type: 'APPROVAL_PENDING',
        dedupeKey: `approval:quotation:${quotation.id}`,
        title: 'Cotação aguardando decisão',
        message: `Cotação nº ${quotation.number} aguardando escolha do fornecedor vencedor.`,
        permissionCode: 'quotation.view',
        linkUrl: '/erp/compras/cotacoes',
        documentRef: String(quotation.number),
        occurredAt: quotation.createdAt,
      });
    }

    for (const purchase of purchasesAwaitingApproval) {
      const who =
        purchase.partner?.tradeName ?? purchase.partner?.legalName ?? '';

      await this.notifications.emit({
        companyId: purchase.companyId,
        type: 'APPROVAL_PENDING',
        dedupeKey: `approval:purchase-draft:${purchase.id}`,
        title: 'Compra aguardando aprovação',
        message: `Compra nº ${purchase.number}${who ? ` (${who})` : ''} aguardando aprovação.`,
        permissionCode: 'purchase.approve',
        linkUrl: '/erp/compras',
        documentRef: String(purchase.number),
        occurredAt: purchase.createdAt,
      });
    }

    for (const purchase of purchases) {
      const who =
        purchase.partner?.tradeName ?? purchase.partner?.legalName ?? '';

      await this.notifications.emit({
        companyId: purchase.companyId,
        type: 'APPROVAL_PENDING',
        dedupeKey: `approval:purchase:${purchase.id}`,
        title: 'Compra aguardando recebimento',
        message: `Compra nº ${purchase.number}${who ? ` (${who})` : ''} aprovada, aguardando recebimento.`,
        permissionCode: 'purchase.view',
        linkUrl: '/erp/compras/recebimento',
        documentRef: String(purchase.number),
      });
    }

    for (const sale of salesAwaitingApproval) {
      const who = sale.partner?.tradeName ?? sale.partner?.legalName ?? '';

      await this.notifications.emit({
        companyId: sale.companyId,
        type: 'APPROVAL_PENDING',
        dedupeKey: `approval:sale-draft:${sale.id}`,
        title: 'Venda aguardando aprovação',
        message: `Venda nº ${sale.number}${who ? ` (${who})` : ''} aguardando aprovação.`,
        permissionCode: 'sale.approve',
        linkUrl: '/erp/vendas',
        documentRef: String(sale.number),
        occurredAt: sale.createdAt,
      });
    }

    for (const sale of sales) {
      const who = sale.partner?.tradeName ?? sale.partner?.legalName ?? '';

      await this.notifications.emit({
        companyId: sale.companyId,
        type: 'APPROVAL_PENDING',
        dedupeKey: `approval:sale:${sale.id}`,
        title: 'Venda aguardando faturamento',
        message: `Venda nº ${sale.number}${who ? ` (${who})` : ''} aprovada, aguardando faturamento.`,
        permissionCode: 'sale.view',
        linkUrl: '/erp/vendas',
        documentRef: String(sale.number),
      });
    }

    await this.clearResolvedApprovals(
      'approval:quotation:',
      quotations.map((q) => q.id),
    );
    await this.clearResolvedApprovals(
      'approval:purchase-draft:',
      purchasesAwaitingApproval.map((p) => p.id),
    );
    await this.clearResolvedApprovals(
      'approval:purchase:',
      purchases.map((p) => p.id),
    );
    await this.clearResolvedApprovals(
      'approval:sale-draft:',
      salesAwaitingApproval.map((s) => s.id),
    );
    await this.clearResolvedApprovals(
      'approval:sale:',
      sales.map((s) => s.id),
    );
  }

  private async clearResolvedApprovals(
    prefix: string,
    stillPendingIds: string[],
  ) {
    const stillPending = new Set(stillPendingIds);
    const flagged = await this.prisma.notification.findMany({
      where: {
        type: 'APPROVAL_PENDING',
        readAt: null,
        dedupeKey: { startsWith: prefix },
      },
    });

    for (const notification of flagged) {
      const id = notification.dedupeKey.replace(prefix, '');
      if (!stillPending.has(id)) {
        await this.notifications.clearIfUnread(
          notification.dedupeKey,
          notification.companyId || undefined,
          notification.rootCompanyId || undefined,
        );
      }
    }
  }

  private async checkLicenseExpiring() {
    const soon = new Date(
      Date.now() + LICENSE_WARNING_DAYS * MS_PER_DAY,
    );

    const plans = await this.prisma.companyPlan.findMany({
      where: {
        active: true,
        trialEndsAt: { not: null, lte: soon, gte: new Date() },
      },
    });

    for (const plan of plans) {
      await this.notifications.emit({
        companyId: plan.companyId,
        type: 'LICENSE_EXPIRING',
        dedupeKey: `license:${plan.companyId}:${plan.trialEndsAt!.toISOString().slice(0, 10)}`,
        title: 'Licença/trial vencendo',
        message: `O período de teste vence em ${dateLabel(plan.trialEndsAt!)}.`,
        permissionCode: 'license.view',
        linkUrl: '/erp/licenciamento',
        occurredAt: new Date(),
      });
    }
  }

  private async checkLowStock() {
    const products = await this.prisma.product.findMany({
      where: { minimumStock: { gt: 0 } },
      select: { id: true, code: true, description: true, minimumStock: true },
    });

    if (products.length === 0) {
      return;
    }

    const minimumById = new Map(
      products.map((p) => [p.id, Number(p.minimumStock)]),
    );

    const inventories = await this.prisma.inventory.findMany({
      where: { productId: { in: products.map((p) => p.id) } },
      select: {
        productId: true,
        companyId: true,
        quantity: true,
        blockedQuantity: true,
        reservedQuantity: true,
        quarantineQuantity: true,
        damagedQuantity: true,
      },
    });

    const totalsByProductAndCompany = new Map<string, number>();
    for (const inv of inventories) {
      const key = `${inv.productId}:${inv.companyId}`;
      const available = calculateAvailableQuantity(inv);
      totalsByProductAndCompany.set(
        key,
        (totalsByProductAndCompany.get(key) ?? 0) + available,
      );
    }

    const today = new Date().toISOString().slice(0, 10);

    for (const [key, total] of totalsByProductAndCompany) {
      const [productId, companyId] = key.split(':');
      const minimum = minimumById.get(productId) ?? 0;
      const dedupeKey = `low-stock:${productId}:${companyId}:${today}`;

      if (total > minimum) {
        continue;
      }

      const product = products.find((p) => p.id === productId)!;

      await this.notifications.emit({
        companyId,
        type: 'LOW_STOCK',
        dedupeKey,
        title: 'Estoque baixo',
        message: `${product.code} — ${product.description} está com saldo abaixo do mínimo (${total} de ${minimum}).`,
        permissionCode: 'product.view',
        linkUrl: '/erp/produtos',
        documentRef: product.code,
        occurredAt: new Date(),
      });
    }
  }
}
