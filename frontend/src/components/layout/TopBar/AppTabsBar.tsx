"use client";

import { X } from "lucide-react";

import { useAuth } from "@/providers/AuthProvider";
import { APP_LABEL, useTabsContext } from "@/providers/TabsProvider";

import { Brand } from "../Brand/Brand";
import { ThemeSwitcher } from "../ThemeSwitcher";
import { UserMenu } from "../UserMenu/UserMenu";
import { AppLauncher } from "./AppLauncher";
import { CompanySwitcher } from "./CompanySwitcher";
import { NotificationsButton } from "./NotificationsButton";

/**
 * Barra única do topo: logo/nome da empresa, separador, ícone de apps +
 * guias de app abertas (fecháveis, exceto a última) à esquerda,
 * tema/empresa/usuário à direita — substitui o antigo `TopBar` (o rótulo
 * da tela ficou redundante com a guia de 2º nível já mostrando o nome
 * dela, ver `TabsBar`).
 */
export function AppTabsBar() {
  const { user, hasModule } = useAuth();
  const { openApps, currentApp, openApp, closeApp } = useTabsContext();

  const canToggleTheme =
    hasModule("BRANDING") &&
    Boolean(user?.company.brandingThemeToggleEnabled);

  return (
    <header className="flex min-h-16 shrink-0 items-center justify-between gap-3 rounded-3xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 shadow-sm">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="min-w-0 max-w-[240px] shrink-0">
          <Brand />
        </div>

        <div className="h-10 w-px shrink-0 bg-[var(--border)]" />

        <AppLauncher />

        <div role="tablist" aria-label="Apps" className="flex min-w-0 gap-1">
          {openApps.map((app) => {
            const active = app === currentApp;
            const closable = openApps.length > 1;

            return (
              <div
                key={app}
                role="tab"
                aria-selected={active}
                className={`flex items-center gap-1 rounded-xl py-1 pl-3 pr-1 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-[var(--surface-hover)] text-[var(--text-primary)]"
                    : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-secondary)]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => openApp(app)}
                  className="py-1"
                >
                  {APP_LABEL[app]}
                </button>

                {closable && (
                  <button
                    type="button"
                    onClick={() => closeApp(app)}
                    aria-label={`Fechar ${APP_LABEL[app]}`}
                    className="flex size-6 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {canToggleTheme && <ThemeSwitcher />}

        <NotificationsButton />

        <CompanySwitcher />

        <UserMenu />
      </div>
    </header>
  );
}
