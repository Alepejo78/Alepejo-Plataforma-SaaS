"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Bell } from "lucide-react";

import {
  notificationService,
  type NotificationItem,
} from "@/services/notification.service";

import { NotificationDetailModal } from "./NotificationDetailModal";

const POLL_INTERVAL_MS = 15000;

function timeAgo(value: string) {
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.round(diffMs / 60000);

  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `há ${hours}h`;

  const days = Math.round(hours / 24);
  return `há ${days}d`;
}

/** Sino de notificações da barra do topo — badge, lista e detalhe. */
export function NotificationsButton() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<NotificationItem | null>(
    null
  );

  const containerRef = useRef<HTMLDivElement | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await notificationService.listUnread();
      setItems(result);
    } catch {
      // Falha silenciosa — o sino simplesmente não atualiza agora.
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    pollRef.current = setInterval(() => void load(), POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [load]);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  async function handleConfirm(id: string) {
    setItems((prev) => prev.filter((n) => n.id !== id));

    try {
      await notificationService.markAsRead(id);
    } catch {
      // Se falhar, a próxima atualização (polling) traz de volta.
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label="Notificações"
        title="Notificações"
        onClick={() => setOpen((prev) => !prev)}
        className="
          relative
          flex
          size-9
          items-center
          justify-center
          rounded-xl
          border
          border-[var(--border)]
          bg-[var(--surface)]
          text-[var(--text-secondary)]
          transition-colors
          hover:border-[var(--border-strong)]
          hover:bg-[var(--surface-hover)]
          hover:text-[var(--text-primary)]
        "
      >
        <Bell size={18} />

        {items.length > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--danger)] px-1 text-[10px] font-semibold text-white">
            {items.length > 9 ? "9+" : items.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-96 max-w-[90vw] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xl">
          <div className="border-b border-[var(--border)] px-4 py-3">
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              Notificações
            </span>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">
                Nenhuma notificação por enquanto.
              </p>
            )}

            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSelected(item);
                  setOpen(false);
                }}
                className="flex w-full flex-col gap-0.5 border-b border-[var(--border)] px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-[var(--surface-hover)]"
              >
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  {item.title}
                </span>
                <span className="line-clamp-2 text-xs text-[var(--text-secondary)]">
                  {item.message}
                </span>
                <span className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                  {timeAgo(item.occurredAt)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <NotificationDetailModal
        notification={selected}
        onClose={() => setSelected(null)}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
