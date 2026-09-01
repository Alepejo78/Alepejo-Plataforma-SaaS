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

const CONFIRMATION_TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000;

const MONTH_NAMES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function competenceLabel(year: number, month: number): string {
  return `${MONTH_NAMES[month - 1]}/${year}`;
}

/**
 * Confirmação digital de recebimento do holerite — mesmo mecanismo
 * de PpeDeliveriesService (manual pelo RH ou link público por
 * e-mail/WhatsApp, token só em hash, uso único). Serviço separado
 * (em vez de inchar PayrollService) porque essa parte não depende de
 * nada do cálculo da folha, só do item já pronto.
 */
@Injectable()
export class PayrollConfirmationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailNotifications: EmailNotificationsService,
    private readonly whatsappNotifications: WhatsappNotificationsService,
  ) {}

  private async findItemScoped(
    companyId: string,
    payrollId: string,
    itemId: string,
  ) {
    const item = await this.prisma.payrollItem.findFirst({
      where: { id: itemId, payrollId, payroll: { companyId } },
      include: {
        payroll: {
          select: {
            companyId: true,
            competenceYear: true,
            competenceMonth: true,
            paymentDate: true,
          },
        },
        employee: {
          select: { id: true, name: true, email: true, mobile: true },
        },
        financialEntry: { select: { status: true } },
      },
    });

    if (!item) {
      throw new NotFoundException('Item da folha não encontrado.');
    }

    return item;
  }

  /** Confirmação manual — RH confirma na tela que o colaborador recebeu (ex.: entregue em mãos). */
  async confirm(
    companyId: string,
    payrollId: string,
    itemId: string,
    confirmedById: string,
  ) {
    const item = await this.findItemScoped(companyId, payrollId, itemId);

    if (item.confirmationStatus === PayrollConfirmationStatus.CONFIRMADO) {
      throw new BadRequestException('Este holerite já está confirmado.');
    }

    if (item.financialEntry?.status !== 'PAID') {
      throw new BadRequestException(
        'Só é possível confirmar o recebimento depois que o pagamento for baixado no Financeiro.',
      );
    }

    return this.prisma.payrollItem.update({
      where: { id: item.id },
      data: {
        confirmationStatus: PayrollConfirmationStatus.CONFIRMADO,
        confirmedAt: new Date(),
        confirmedById,
      },
    });
  }

  /**
   * Gera (ou renova) o link e manda por e-mail e/ou WhatsApp — mesmo
   * padrão best-effort de PpeDeliveriesService.sendConfirmation.
   * Usado tanto pelo botão manual do RH quanto pelo disparo
   * automático (gerar folha / ajustar item).
   */
  async sendConfirmation(companyId: string, payrollId: string, itemId: string) {
    const item = await this.findItemScoped(companyId, payrollId, itemId);

    if (item.confirmationStatus === PayrollConfirmationStatus.CONFIRMADO) {
      throw new BadRequestException('Este holerite já está confirmado.');
    }

    if (item.financialEntry?.status !== 'PAID') {
      throw new BadRequestException(
        'O envio do holerite só é liberado depois que o pagamento for baixado no Financeiro.',
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

    await this.prisma.payrollItem.update({
      where: { id: item.id },
      data: {
        confirmationTokenHash: tokenHash,
        confirmationTokenExpiresAt: expiresAt,
        confirmationSentAt: new Date(),
      },
    });

    return this.dispatch(companyId, item, token);
  }

  /**
   * Best-effort, sem lançar — usado pelo disparo automático (baixa do
   * título no Financeiro, ver `sendConfirmationBestEffortByItemId`
   * abaixo). Uma falha de envio nunca pode derrubar a baixa.
   */
  async sendConfirmationBestEffort(
    companyId: string,
    payrollId: string,
    itemId: string,
  ) {
    try {
      await this.sendConfirmation(companyId, payrollId, itemId);
    } catch {
      // Sem e-mail/celular cadastrado, ou já confirmado — nada a
      // fazer, o RH ainda pode mandar manual depois se corrigir o
      // cadastro.
    }
  }

  /**
   * Mesma coisa, mas só a partir do id do item — usado por
   * `FinancialEntriesService.settle()`, que só enxerga o título (não
   * sabe o id da folha) quando baixa um título de qualquer origem do
   * ERP. O envio automático do holerite é disparado daqui: só depois
   * que o pagamento é efetivamente realizado, nunca na geração/ajuste
   * da folha.
   */
  async sendConfirmationBestEffortByItemId(itemId: string) {
    const item = await this.prisma.payrollItem.findUnique({
      where: { id: itemId },
      select: { payrollId: true, payroll: { select: { companyId: true } } },
    });

    if (!item) {
      return;
    }

    await this.sendConfirmationBestEffort(
      item.payroll.companyId,
      item.payrollId,
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
      select: { tradeName: true, legalName: true },
    });

    const companyName = company?.tradeName || company?.legalName || '';
    const competence = competenceLabel(
      item.payroll.competenceYear,
      item.payroll.competenceMonth,
    );

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    const link = `${frontendUrl}/confirmar-holerite?payrollId=${item.payrollId}&itemId=${item.id}&token=${token}`;

    const channels: string[] = [];
    const employee = item.employee;

    if (employee.email) {
      const sent = await this.emailNotifications.send(
        companyId,
        employee.email,
        `Holerite disponível — ${competence} — ${companyName}`,
        `<p>Olá, ${employee.name},</p>
<p>Seu holerite de <strong>${competence}</strong> já está disponível, gerado por <strong>${companyName}</strong>. Clique no botão abaixo pra ver o resumo e confirmar que recebeu:</p>
<p style="text-align: center; margin: 24px 0;">
  <a href="${link}" style="background: #2563eb; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Ver holerite e confirmar</a>
</p>
<p style="font-size: 13px; color: #666;">Se o botão não funcionar, copie e cole este link no navegador:<br><a href="${link}">${link}</a></p>`,
      );

      if (sent) {
        channels.push('email');
      }
    }

    if (employee.mobile) {
      const sent = await this.whatsappNotifications.send(
        companyId,
        employee.mobile,
        `Olá, ${employee.name}! Seu holerite de ${competence} (${companyName}) já está disponível. Confira e confirme neste link: ${link}`,
      );

      if (sent) {
        channels.push('whatsapp');
      }
    }

    return { sent: channels.length > 0, channels };
  }

  private async validatePublicToken(payrollId: string, itemId: string, token: string) {
    const item = await this.prisma.payrollItem.findFirst({
      where: { id: itemId, payrollId },
      include: {
        payroll: {
          select: {
            companyId: true,
            competenceYear: true,
            competenceMonth: true,
            paymentDate: true,
          },
        },
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

  /** Resumo breve do holerite pra tela pública (sem login) — não é a ficha completa, só um panorama antes de confirmar. */
  async getPublicInfo(payrollId: string, itemId: string, token: string) {
    const item = await this.validatePublicToken(payrollId, itemId, token);

    const company = await this.prisma.company.findUnique({
      where: { id: item.payroll.companyId },
      select: { tradeName: true, legalName: true },
    });

    return {
      employeeName: item.employee.name,
      companyName: company?.tradeName || company?.legalName || '',
      competence: competenceLabel(
        item.payroll.competenceYear,
        item.payroll.competenceMonth,
      ),
      grossAmount: Number(item.grossAmount),
      totalDeductions: round2(
        Number(item.inssAmount) +
          Number(item.irrfAmount) +
          Number(item.absenceDeductionAmount) +
          Number(item.transportVoucherDeduction) +
          Number(item.benefitDeductions) +
          Number(item.otherDeductions),
      ),
      netAmount: Number(item.netAmount),
      paymentDate: item.payroll.paymentDate,
      status: item.confirmationStatus,
    };
  }

  /** Consumo público do link — o colaborador confirma sem sessão. */
  async confirmPublic(payrollId: string, itemId: string, token: string) {
    await this.validatePublicToken(payrollId, itemId, token);

    await this.prisma.payrollItem.update({
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

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
