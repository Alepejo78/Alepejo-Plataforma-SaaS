"use client";

import { useAuth } from "@/providers/AuthProvider";
import { useSidebar } from "@/providers/TabsProvider";

import type { AppShellProps } from "./AppShell.types";

import { Sidebar } from "../Sidebar";
import { HorizontalNav } from "../HorizontalNav/HorizontalNav";
import { AppTabsBar } from "../TopBar";
import { TabsBar } from "../TabsBar";
import { SubscriptionBanner } from "../SubscriptionBanner/SubscriptionBanner";

/**
 * `workspaceLabel` não aparece mais em lugar nenhum aqui — a guia de
 * 2º nível ativa (`TabsBar`) já mostra o nome da tela, deixaria
 * duplicado. O prop continua aceito só pra não quebrar as telas que já
 * chamam `<AppShell workspaceLabel="...">`.
 */
export function AppShell({ children }: AppShellProps) {
  const { user, hasModule, sessionError } = useAuth();

  const { isOpen: isMenuOpen, toggle: toggleMenu } = useSidebar();

  // Layout horizontal só vale com o módulo BRANDING licenciado —
  // senão a empresa fica sempre na sidebar vertical (padrão).
  const horizontal =
    hasModule("BRANDING") &&
    user?.company.sidebarLayout === "horizontal";

  if (horizontal) {
    return (
      <div className="flex h-screen flex-col gap-3 bg-[var(--background)] p-3">
        <AppTabsBar />

        <TabsBar
          app="erp"
          isMenuOpen={isMenuOpen}
          onOpenMenu={toggleMenu}
        />

        {isMenuOpen && <HorizontalNav />}

        <SubscriptionBanner />

        {sessionError && (
          <div className="rounded-2xl border border-[var(--danger)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
            {sessionError}
          </div>
        )}

        <main
          className="
            flex-1
            overflow-hidden
            rounded-3xl
            border
            border-[var(--border)]
            bg-[var(--surface)]
            shadow-sm
          "
        >
          <div className="h-full overflow-auto p-8">
            {children}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col gap-3 bg-[var(--background)] p-3">
      <AppTabsBar />

      <TabsBar
        app="erp"
        isMenuOpen={isMenuOpen}
        onOpenMenu={toggleMenu}
      />

      <SubscriptionBanner />

      {sessionError && (
        <div className="rounded-2xl border border-[var(--danger)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
          {sessionError}
        </div>
      )}

      <div className="flex flex-1 gap-3 overflow-hidden">
        {isMenuOpen && <Sidebar />}

        <main
          className="
            flex-1
            overflow-hidden
            rounded-3xl
            border
            border-[var(--border)]
            bg-[var(--surface)]
            shadow-sm
          "
        >
          {/*
            A rolagem fica num filho SEM cantos arredondados, separado do
            elemento que arredonda (main, overflow-hidden). Colocar
            overflow-auto + rounded-3xl no mesmo elemento faz o navegador
            "vazar" conteúdo por cima de itens com position: sticky durante
            a rolagem.
          */}
          <div className="h-full overflow-auto p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
