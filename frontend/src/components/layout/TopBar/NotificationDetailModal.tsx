"use client";

import { useRouter } from "next/navigation";

import { Modal } from "@/components/ui/Modal";
import { Typography } from "@/components";

import { type NotificationItem } from "@/services/notification.service";

interface NotificationDetailModalProps {
  notification: NotificationItem | null;
  onClose: () => void;
  onConfirm: (id: string) => void;
}

function formatDateTime(value: string) {
  const date = new Date(value);

  return `${date.toLocaleDateString("pt-BR", {
    timeZone: "UTC",
  })} às ${date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export function NotificationDetailModal({
  notification,
  onClose,
  onConfirm,
}: NotificationDetailModalProps) {
  const router = useRouter();

  if (!notification) {
    return null;
  }

  function handleGoTo() {
    if (notification!.linkUrl) {
      router.push(notification!.linkUrl);
    }
    onConfirm(notification!.id);
    onClose();
  }

  function handleConfirm() {
    onConfirm(notification!.id);
    onClose();
  }

  return (
    <Modal
      open
      title={notification.title}
      size="xl"
      onClose={handleConfirm}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Typography variant="body">{notification.message}</Typography>
        </div>

        <div>
          <Typography
            variant="caption"
            className="text-[var(--text-muted)]"
          >
            Quando
          </Typography>
          <Typography variant="body">
            {formatDateTime(notification.occurredAt)}
          </Typography>
        </div>

        {notification.actorName && (
          <div>
            <Typography
              variant="caption"
              className="text-[var(--text-muted)]"
            >
              Quem fez
            </Typography>
            <Typography variant="body">
              {notification.actorName}
            </Typography>
          </div>
        )}

        {notification.documentRef && (
          <div>
            <Typography
              variant="caption"
              className="text-[var(--text-muted)]"
            >
              Documento
            </Typography>
            <Typography variant="body">
              {notification.documentRef}
            </Typography>
          </div>
        )}
      </div>

      <div className="mt-6 flex items-center justify-end gap-3">
        {notification.linkUrl && (
          <button
            type="button"
            onClick={handleGoTo}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
          >
            Ir para a tela
          </button>
        )}

        <button
          type="button"
          onClick={handleConfirm}
          className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-contrast)] transition-colors hover:opacity-90"
        >
          OK
        </button>
      </div>
    </Modal>
  );
}
