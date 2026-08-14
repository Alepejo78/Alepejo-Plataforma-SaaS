"use client";

import { Bell } from "lucide-react";

/** Botão de notificações da barra do topo — só o sino, sem rótulo. */
export function NotificationsButton() {
  return (
    <button
      type="button"
      aria-label="Notificações"
      title="Notificações"
      className="
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
    </button>
  );
}
