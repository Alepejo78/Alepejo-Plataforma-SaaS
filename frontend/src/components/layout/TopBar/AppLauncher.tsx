"use client";

import { useEffect, useRef, useState } from "react";
import { LayoutGrid } from "lucide-react";

import { APP_LABEL, useTabsContext, type AppKey } from "@/providers/TabsProvider";

const APPS: AppKey[] = ["erp", "os"];

/**
 * Ícone no início da barra de guias de app — abre um painel por cima da
 * tela com os apps do sistema (Sistema ERP/OS) pra abrir. Diferente do
 * menu do ERP (que fica fixo, não é overlay): este é só o "seletor de
 * app", cabe ser overlay mesmo.
 */
export function AppLauncher() {
  const { openApps, openApp } = useTabsContext();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        aria-expanded={open}
        aria-label="Abrir apps"
        className="flex size-9 shrink-0 items-center justify-center rounded-xl text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
      >
        <LayoutGrid size={18} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-2 w-56 space-y-0.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-lg">
          <p className="px-3 pb-1 pt-1.5 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
            Apps
          </p>

          {APPS.map((app) => {
            const isOpen = openApps.includes(app);

            return (
              <button
                key={app}
                type="button"
                onClick={() => {
                  setOpen(false);
                  openApp(app);
                }}
                className="flex h-10 w-full items-center justify-between gap-2 rounded-xl px-3 text-left text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
              >
                {APP_LABEL[app]}

                {isOpen && (
                  <span className="shrink-0 text-xs text-[var(--text-muted)]">
                    Aberto
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
