"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";

import { useTabs, type AppKey } from "@/providers/TabsProvider";

interface TabsBarProps {
  app: AppKey;
  /** Só o ERP tem sidebar pra mostrar/esconder — OS navega só por cards. */
  onOpenMenu?: () => void;
  isMenuOpen?: boolean;
}

/** Guias de 2º nível (telas abertas dentro do app atual). */
export function TabsBar({ app, onOpenMenu, isMenuOpen }: TabsBarProps) {
  const { openTabs, activeHref, homeHref, closeTab, capMessage } =
    useTabs(app);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-1.5">
        {onOpenMenu && (
          <button
            type="button"
            onClick={onOpenMenu}
            aria-label={isMenuOpen ? "Fechar menu" : "Abrir menu"}
            className="flex size-9 shrink-0 items-center justify-center rounded-xl text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
          >
            {isMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        )}

        {openTabs.map((tab) => {
          const active = tab.href === activeHref;
          const closable = tab.href !== homeHref;

          return (
            <div
              key={tab.href}
              className={`flex items-center gap-1 rounded-xl px-1 transition-colors ${
                active
                  ? "bg-[var(--surface-hover)] text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
              }`}
            >
              <Link
                href={tab.href}
                className="max-w-40 truncate py-2 pl-2.5 text-sm font-medium"
                title={tab.title}
              >
                {tab.title}
              </Link>

              {closable && (
                <button
                  type="button"
                  onClick={() => closeTab(tab.href)}
                  aria-label={`Fechar ${tab.title}`}
                  className="flex size-6 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {capMessage && (
        <div className="rounded-xl border border-[var(--warning)] bg-[var(--warning-soft)] px-3 py-2 text-xs font-medium text-[var(--warning)]">
          {capMessage}
        </div>
      )}
    </div>
  );
}
