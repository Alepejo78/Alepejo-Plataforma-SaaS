import { NotificationType } from '@prisma/client';

/** Shape de resposta de uma notificação do sino. */
export interface NotificationListItemDto {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  linkUrl: string | null;
  documentRef: string | null;
  actorName: string | null;
  occurredAt: Date;
}
