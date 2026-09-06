import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';
import { hasPermission } from '../../../core/utils/permission.util';
import { AuthenticatedUser } from '../../identity/auth/interfaces/authenticated-user.interface';

import { NotificationListItemDto } from '../dto/notification-list-item.dto';

export interface EmitNotificationParams {
  companyId?: string;
  rootCompanyId?: string;
  type: NotificationType;
  dedupeKey: string;
  title: string;
  message: string;
  permissionCode: string;
  linkUrl?: string;
  documentRef?: string;
  actorUserId?: string;
  occurredAt?: Date;
  /** Aviso pessoal (ex.: fechamento do banco de horas) — só esse login enxerga, ignora `permissionCode`. */
  userId?: string;
}

@Injectable()
export class InAppNotificationsService {
  private readonly logger = new Logger(InAppNotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lista não lidas visíveis pro usuário: escopo (empresa ativa OU
   * grupo) + filtro por permissão (DENY sempre vence, mesma regra do
   * resto do sistema) — cada notificação carrega seu próprio
   * `permissionCode`, então o filtro é por item, não por rota.
   */
  async listUnread(
    user: AuthenticatedUser,
  ): Promise<NotificationListItemDto[]> {
    const notifications = await this.prisma.notification.findMany({
      where: {
        readAt: null,
        OR: [
          { companyId: user.companyId },
          { rootCompanyId: user.rootCompanyId },
          { userId: user.id },
        ],
      },
      include: {
        actor: { select: { name: true } },
      },
      orderBy: { occurredAt: 'desc' },
      take: 100,
    });

    return notifications
      .filter((n) => n.userId === user.id || hasPermission(user, n.permissionCode))
      .map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        linkUrl: n.linkUrl,
        documentRef: n.documentRef,
        actorName: n.actor?.name ?? null,
        occurredAt: n.occurredAt,
      }));
  }

  async markAsRead(
    user: AuthenticatedUser,
    id: string,
  ): Promise<void> {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id,
        OR: [
          { companyId: user.companyId },
          { rootCompanyId: user.rootCompanyId },
          { userId: user.id },
        ],
      },
    });

    if (!notification) {
      throw new NotFoundException('Notificação não encontrada.');
    }

    await this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  /** Marca como lidas todas as notificações hoje visíveis pro sino desse usuário. */
  async markAllAsRead(user: AuthenticatedUser): Promise<void> {
    const visible = await this.listUnread(user);

    if (visible.length === 0) {
      return;
    }

    await this.prisma.notification.updateMany({
      where: { id: { in: visible.map((n) => n.id) } },
      data: { readAt: new Date() },
    });
  }

  /**
   * Registra uma notificação de forma idempotente (upsert por
   * dedupeKey) — nunca lança, best-effort igual ao padrão de
   * EmailNotificationsService.send, pra nunca derrubar o fluxo
   * principal (cadastro, cron) por causa do sino.
   */
  async emit(params: EmitNotificationParams): Promise<void> {
    try {
      const companyId = params.companyId ?? '';
      const rootCompanyId = params.rootCompanyId ?? '';

      await this.prisma.notification.upsert({
        where: {
          dedupeKey_companyId_rootCompanyId: {
            dedupeKey: params.dedupeKey,
            companyId,
            rootCompanyId,
          },
        },
        update: {},
        create: {
          companyId,
          rootCompanyId,
          type: params.type,
          dedupeKey: params.dedupeKey,
          title: params.title,
          message: params.message,
          permissionCode: params.permissionCode,
          linkUrl: params.linkUrl,
          documentRef: params.documentRef,
          actorUserId: params.actorUserId,
          userId: params.userId,
          occurredAt: params.occurredAt ?? new Date(),
        },
      });
    } catch (err) {
      this.logger.warn(
        `Falha ao emitir notificação (${params.dedupeKey}): ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  /**
   * Some com a notificação não lida se a condição de origem deixou de
   * valer (conta paga, exame refeito, saiu do status pendente) —
   * chamado pelo cron a cada passada, nunca lança.
   */
  async clearIfUnread(
    dedupeKey: string,
    companyId?: string,
    rootCompanyId?: string,
  ): Promise<void> {
    try {
      await this.prisma.notification.deleteMany({
        where: {
          dedupeKey,
          companyId: companyId ?? '',
          rootCompanyId: rootCompanyId ?? '',
          readAt: null,
        },
      });
    } catch (err) {
      this.logger.warn(
        `Falha ao limpar notificação (${dedupeKey}): ${err instanceof Error ? err.message : err}`,
      );
    }
  }
}
