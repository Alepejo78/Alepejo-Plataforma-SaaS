import * as crypto from 'crypto';

import { BadRequestException, Injectable, Logger } from '@nestjs/common';

import { NotificationType, ServiceOrderStatus } from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';
import { findUsersWithPermission } from '../../../core/utils/permission-users.util';
import { EmailNotificationsService } from '../../notifications/services/email-notifications.service';
import { WhatsappNotificationsService } from '../../notifications/services/whatsapp-notifications.service';
import { InAppNotificationsService } from '../../in-app-notifications/services/in-app-notifications.service';
import { SalesOrderService } from '../../sales-orders/services/sales-order.service';

import { ServiceOrderService, serviceOrderNumberOf } from './service-order.service';
import { ServiceOrderPdfService } from './service-order-pdf.service';

import { PublicRequestRevisionServiceOrderDto } from '../dto/public-request-revision-service-order.dto';
import { PublicCancelServiceOrderDto } from '../dto/public-cancel-service-order.dto';

/** Sem data de validade cadastrada (a OS não tem esse campo), o link vale por esse tanto. */
const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Permissão de quem lida com a confirmação da OS — usada tanto na rota de envio quanto pra notificar internamente. */
const RESPONSIBLE_PERMISSION = 'service-order.send-confirmation';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Confirmação digital da Ordem de Serviço pelo cliente — mesmo
 * mecanismo de `QuoteConfirmationService` (token público, sem login,
 * link por e-mail/WhatsApp), mesmo esquema do Orçamento (Confirmar/
 * Revisar/Cancelar). Diferente do Orçamento, aqui o cliente aprova o
 * ESCOPO antes do serviço ser executado — ao confirmar, a OS só entra
 * em execução (IN_PROGRESS), sem gerar Pedido nenhum ainda. O Pedido
 * de Venda só nasce quando a própria empresa marca o serviço como
 * finalizado (ver `complete`), depois de executar o trabalho — nesse
 * momento o cliente é avisado por e-mail/WhatsApp que já pode retirar,
 * sem precisar confirmar nada de novo.
 */
@Injectable()
export class ServiceOrderConfirmationService {
  private readonly logger = new Logger(ServiceOrderConfirmationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailNotifications: EmailNotificationsService,
    private readonly whatsappNotifications: WhatsappNotificationsService,
    private readonly notifications: InAppNotificationsService,
    private readonly serviceOrderService: ServiceOrderService,
    private readonly serviceOrderPdf: ServiceOrderPdfService,
    private readonly salesOrderService: SalesOrderService,
  ) {}

  /** Gera (ou renova) o link e manda por e-mail/WhatsApp ao cliente. */
  async sendConfirmation(companyId: string, id: string) {
    const order = await this.serviceOrderService.findOne(companyId, id);

    // Envio pro cliente aprovar o escopo, antes da execução começar
    // (mesmo esquema do Orçamento) — fica a critério de quem está
    // usando decidir quando mandar (ex.: OS nascida de um orçamento
    // já aprovado pode ser enviada assim que criada). Uma vez em
    // execução, esse aviso não faz mais sentido — quem confirma que
    // o serviço acabou é a própria empresa, clicando em "Finalizar
    // serviço" (ver `complete`), não um novo link pro cliente.
    if (
      order.status !== ServiceOrderStatus.DRAFT &&
      order.status !== ServiceOrderStatus.REVISION_REQUESTED
    ) {
      throw new BadRequestException(
        'Esta ordem de serviço não pode ser enviada para o cliente aprovar neste status.',
      );
    }

    const partner = order.partner;

    if (!partner.email && !partner.mobile) {
      throw new BadRequestException(
        'Este cliente não tem e-mail nem celular cadastrado — não há como enviar o link de confirmação.',
      );
    }

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

    await this.prisma.serviceOrder.update({
      where: { id: order.id },
      data: {
        status: ServiceOrderStatus.AWAITING_CONFIRMATION,
        confirmationTokenHash: tokenHash,
        confirmationTokenExpiresAt: expiresAt,
        confirmationSentAt: new Date(),
      },
    });

    return this.dispatch(companyId, order, token);
  }

  private async dispatch(
    companyId: string,
    order: Awaited<ReturnType<ServiceOrderService['findOne']>>,
    token: string,
  ) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    const companyName = company?.tradeName || company?.legalName || '';
    const partner = order.partner;
    const partnerName = partner.tradeName || partner.legalName;
    const orderNumber = serviceOrderNumberOf(order);

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    const link = `${frontendUrl}/confirmar-ordem-servico?id=${order.id}&token=${token}`;

    const pdf = await this.serviceOrderPdf
      .generate(order, company)
      .catch((err: unknown) => {
        this.logger.warn(
          `Falha ao gerar PDF da ordem de serviço ${orderNumber}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );

        return null;
      });

    const summaryHtml = this.serviceOrderService.buildSummaryHtml(order);

    const channels: string[] = [];

    if (partner.email) {
      const sent = await this.emailNotifications.send(
        companyId,
        partner.email,
        `Ordem de Serviço ${orderNumber} pronta para sua confirmação — ${companyName}`,
        `<p>Olá, ${partnerName},</p>
<p>A Ordem de Serviço <strong>${orderNumber}</strong> de <strong>${companyName}</strong> está pronta para sua confirmação. Confira os detalhes abaixo e clique no botão para confirmar:</p>
${summaryHtml}
<p style="text-align: center; margin: 24px 0;">
  <a href="${link}" style="background: #2563eb; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Ver e confirmar</a>
</p>
<p style="font-size: 13px; color: #666;">Se o botão não funcionar, copie e cole este link no navegador:<br><a href="${link}">${link}</a></p>`,
        pdf
          ? [
              {
                filename: `${orderNumber}.pdf`,
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

    if (partner.mobile) {
      const sent = await this.whatsappNotifications.send(
        companyId,
        partner.mobile,
        `Olá, ${partnerName}! A Ordem de Serviço ${orderNumber} (${companyName}) está pronta pra você confirmar. Confira aqui: ${link}`,
      );

      if (sent) {
        channels.push('whatsapp');
      }
    }

    return { sent: channels.length > 0, channels };
  }

  private async validatePublicToken(id: string, token: string) {
    const order = await this.prisma.serviceOrder.findFirst({
      where: { id },
      include: {
        partner: true,
        serviceItems: { include: { product: true } },
        productItems: { include: { product: true } },
      },
    });

    if (
      !order ||
      !order.confirmationTokenHash ||
      !order.confirmationTokenExpiresAt ||
      order.confirmationTokenExpiresAt < new Date()
    ) {
      throw new BadRequestException(
        'Link de confirmação inválido ou expirado. Peça um novo link.',
      );
    }

    if (hashToken(token) !== order.confirmationTokenHash) {
      throw new BadRequestException(
        'Link de confirmação inválido ou expirado. Peça um novo link.',
      );
    }

    return order;
  }

  /** Resumo pra tela pública (sem login). */
  async getPublicInfo(id: string, token: string) {
    const order = await this.validatePublicToken(id, token);

    const company = await this.prisma.company.findUnique({
      where: { id: order.companyId },
      select: {
        tradeName: true,
        legalName: true,
        logo: true,
        brandingLogoLightEnabled: true,
      },
    });

    return {
      orderNumber: serviceOrderNumberOf(order),
      companyName: company?.tradeName || company?.legalName || '',
      companyLogo: company?.brandingLogoLightEnabled ? company.logo : null,
      partnerName: order.partner.tradeName || order.partner.legalName,
      description: order.description,
      completedAt: order.completedAt,
      serviceItems: order.serviceItems.map((item) => ({
        description: item.product?.description ?? item.productId,
        detail: item.description,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
      })),
      productItems: order.productItems.map((item) => ({
        description: item.product?.description ?? item.productId,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
      })),
      netAmount: Number(order.netAmount),
      status: order.status,
      customerRevisionNote: order.customerRevisionNote,
      customerCancelReason: order.customerCancelReason,
    };
  }

  /** Best-effort: avisa quem lida com confirmação da OS por e-mail. */
  private async notifyResponsibles(
    companyId: string,
    subject: string,
    html: string,
  ) {
    const users = await findUsersWithPermission(
      this.prisma,
      companyId,
      RESPONSIBLE_PERMISSION,
    );

    for (const user of users) {
      void this.emailNotifications.send(companyId, user.email, subject, html);
    }
  }

  /**
   * Consumo público — cliente aprova o escopo descrito e a OS entra
   * em execução. Não gera Pedido nenhum ainda (isso só acontece
   * quando a empresa finaliza o serviço, ver `complete`).
   */
  async confirmPublic(id: string, token: string) {
    const order = await this.validatePublicToken(id, token);

    if (order.status !== ServiceOrderStatus.AWAITING_CONFIRMATION) {
      throw new BadRequestException(
        'Esta ordem de serviço não está mais aguardando confirmação.',
      );
    }

    await this.prisma.serviceOrder.update({
      where: { id: order.id },
      data: {
        status: ServiceOrderStatus.IN_PROGRESS,
        customerConfirmedAt: new Date(),
        confirmationTokenHash: null,
        confirmationTokenExpiresAt: null,
      },
    });

    const company = await this.prisma.company.findUnique({
      where: { id: order.companyId },
      select: { rootCompanyId: true },
    });
    const rootCompanyId = company?.rootCompanyId ?? order.companyId;
    const orderNumber = serviceOrderNumberOf(order);

    void this.notifications.emit({
      rootCompanyId,
      type: NotificationType.SERVICE_ORDER_CONFIRMED_BY_CUSTOMER,
      dedupeKey: `service-order-confirmed-customer:${order.id}`,
      title: 'Cliente aprovou a ordem de serviço',
      message: `O cliente aprovou o escopo da ordem de serviço ${orderNumber} — pode iniciar a execução.`,
      permissionCode: RESPONSIBLE_PERMISSION,
      linkUrl: '/erp/vendas/ordens-servico',
      documentRef: orderNumber,
    });

    return { success: true };
  }

  /**
   * Empresa marca o serviço como finalizado — gera o Pedido de Venda
   * (combinando itens de serviço e produto num só) e avisa o cliente
   * por e-mail/WhatsApp que já pode retirar, sem exigir nenhuma nova
   * confirmação dele (diferente do envio de `sendConfirmation`, este
   * é só informativo).
   */
  async complete(companyId: string, id: string, userId: string) {
    const order = await this.serviceOrderService.findOne(companyId, id);

    if (order.status !== ServiceOrderStatus.IN_PROGRESS) {
      throw new BadRequestException(
        'Somente ordens de serviço em execução podem ser finalizadas.',
      );
    }

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    const rootCompanyId = company?.rootCompanyId ?? companyId;

    const orderNumber = serviceOrderNumberOf(order);
    const generatedNote = `Gerado automaticamente a partir da Ordem de Serviço ${orderNumber}.`;

    const salesOrder = await this.salesOrderService.create(
      order.companyId,
      rootCompanyId,
      {
        partnerId: order.partnerId,
        warehouseId: order.warehouseId,
        orderDate: new Date(),
        observation: order.observation
          ? `${order.observation}\n\n${generatedNote}`
          : generatedNote,
        discountValue: Number(order.discountValue),
        freightValue: Number(order.freightValue),
        otherExpenses: Number(order.otherExpenses),
        chartOfAccountId: order.chartOfAccountId ?? undefined,
        termDays: order.termDays ?? undefined,
        paymentMethod: order.paymentMethod ?? undefined,
        installmentsCount: order.installmentsCount ?? undefined,
        installments: order.plannedInstallments
          ? (order.plannedInstallments as unknown as {
              dueDate: string;
              amount: number;
            }[])
          : undefined,
        items: [
          ...order.serviceItems.map((item) => ({
            productId: item.productId,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
          })),
          ...order.productItems.map((item) => ({
            productId: item.productId,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
          })),
        ],
      },
      userId,
      // Serviço já finalizado pela própria empresa — o Pedido gerado
      // nasce pronto pra virar Venda, sem precisar de aprovação própria.
      true,
    );

    await this.prisma.$transaction([
      this.prisma.serviceOrder.update({
        where: { id: order.id },
        data: {
          status: ServiceOrderStatus.CONFIRMED,
          completedAt: new Date(),
          updatedById: userId,
        },
      }),
      this.prisma.salesOrder.update({
        where: { id: salesOrder.id },
        data: { serviceOrderId: order.id },
      }),
    ]);

    await this.notifyCompleted(companyId, order, orderNumber);

    return { success: true, salesOrder };
  }

  /** Avisa o cliente (e-mail/WhatsApp, com PDF) que o serviço acabou — sem link, não exige nenhuma ação dele. */
  private async notifyCompleted(
    companyId: string,
    order: Awaited<ReturnType<ServiceOrderService['findOne']>>,
    orderNumber: string,
  ) {
    const partner = order.partner;

    if (!partner.email && !partner.mobile) {
      return;
    }

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    const companyName = company?.tradeName || company?.legalName || '';
    const partnerName = partner.tradeName || partner.legalName;

    const pdf = await this.serviceOrderPdf
      .generate(order, company)
      .catch((err: unknown) => {
        this.logger.warn(
          `Falha ao gerar PDF da ordem de serviço ${orderNumber}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );

        return null;
      });

    const summaryHtml = this.serviceOrderService.buildSummaryHtml(order);

    if (partner.email) {
      await this.emailNotifications.send(
        companyId,
        partner.email,
        `Ordem de Serviço ${orderNumber} finalizada — ${companyName}`,
        `<p>Olá, ${partnerName},</p>
<p>O serviço da Ordem de Serviço <strong>${orderNumber}</strong> de <strong>${companyName}</strong> foi finalizado e o veículo já pode ser retirado.</p>
${summaryHtml}`,
        pdf
          ? [
              {
                filename: `${orderNumber}.pdf`,
                content: pdf,
                contentType: 'application/pdf',
              },
            ]
          : undefined,
      );
    }

    if (partner.mobile) {
      await this.whatsappNotifications.send(
        companyId,
        partner.mobile,
        `Olá, ${partnerName}! O serviço da Ordem de Serviço ${orderNumber} (${companyName}) foi finalizado e o veículo já pode ser retirado.`,
      );
    }
  }

  /** Consumo público — cliente pede revisão, descrevendo o que falta ajustar. */
  async requestRevisionPublic(
    id: string,
    token: string,
    dto: PublicRequestRevisionServiceOrderDto,
  ) {
    const order = await this.validatePublicToken(id, token);

    if (order.status !== ServiceOrderStatus.AWAITING_CONFIRMATION) {
      throw new BadRequestException(
        'Esta ordem de serviço não está mais aguardando confirmação.',
      );
    }

    await this.prisma.serviceOrder.update({
      where: { id: order.id },
      data: {
        status: ServiceOrderStatus.REVISION_REQUESTED,
        customerRevisionNote: dto.message,
        customerRevisionAt: new Date(),
        confirmationTokenHash: null,
        confirmationTokenExpiresAt: null,
      },
    });

    const orderNumber = serviceOrderNumberOf(order);

    void this.notifications.emit({
      rootCompanyId: order.companyId,
      type: NotificationType.SERVICE_ORDER_REVISION_REQUESTED,
      dedupeKey: `service-order-revision:${order.id}:${Date.now()}`,
      title: 'Cliente pediu revisão da ordem de serviço',
      message: `${order.partner.tradeName || order.partner.legalName} pediu revisão da ordem de serviço ${orderNumber}: "${dto.message}"`,
      permissionCode: RESPONSIBLE_PERMISSION,
      linkUrl: '/erp/vendas/ordens-servico',
      documentRef: orderNumber,
    });

    void this.notifyResponsibles(
      order.companyId,
      `Cliente pediu revisão da ordem de serviço ${orderNumber}`,
      `<p>O cliente <strong>${order.partner.tradeName || order.partner.legalName}</strong> pediu revisão da ordem de serviço <strong>${orderNumber}</strong>:</p>
<blockquote style="margin: 16px 0; padding: 12px 16px; border-left: 3px solid #2563eb; background: #f5f7fb;">${dto.message}</blockquote>
<p>Ajuste o que for preciso e envie o link de confirmação novamente pro cliente.</p>`,
    );

    return { success: true };
  }

  /** Consumo público — cliente cancela, informando o motivo. */
  async cancelPublic(
    id: string,
    token: string,
    dto: PublicCancelServiceOrderDto,
  ) {
    const order = await this.validatePublicToken(id, token);

    if (order.status !== ServiceOrderStatus.AWAITING_CONFIRMATION) {
      throw new BadRequestException(
        'Esta ordem de serviço não está mais aguardando confirmação.',
      );
    }

    await this.prisma.serviceOrder.update({
      where: { id: order.id },
      data: {
        status: ServiceOrderStatus.CANCELLED,
        customerCancelReason: dto.reason,
        customerCancelledAt: new Date(),
        confirmationTokenHash: null,
        confirmationTokenExpiresAt: null,
      },
    });

    const orderNumber = serviceOrderNumberOf(order);

    void this.notifications.emit({
      rootCompanyId: order.companyId,
      type: NotificationType.SERVICE_ORDER_CANCELLED_BY_CUSTOMER,
      dedupeKey: `service-order-cancelled-customer:${order.id}`,
      title: 'Cliente cancelou a ordem de serviço',
      message: `${order.partner.tradeName || order.partner.legalName} cancelou a ordem de serviço ${orderNumber}: "${dto.reason}"`,
      permissionCode: RESPONSIBLE_PERMISSION,
      linkUrl: '/erp/vendas/ordens-servico',
      documentRef: orderNumber,
    });

    void this.notifyResponsibles(
      order.companyId,
      `Cliente cancelou a ordem de serviço ${orderNumber}`,
      `<p>O cliente <strong>${order.partner.tradeName || order.partner.legalName}</strong> cancelou a ordem de serviço <strong>${orderNumber}</strong>:</p>
<blockquote style="margin: 16px 0; padding: 12px 16px; border-left: 3px solid #dc2626; background: #fef2f2;">${dto.reason}</blockquote>`,
    );

    return { success: true };
  }
}
