"use client";

import { useState } from "react";

import { useAuth } from "@/providers/AuthProvider";

import type { AppShellProps } from "./AppShell.types";

import { Sidebar } from "../Sidebar";
import { HorizontalNav } from "../HorizontalNav/HorizontalNav";
import { TopBar } from "../TopBar";

export function AppShell({
  children,
  workspaceLabel,
}: AppShellProps) {
  const { user, hasModule, sessionError } = useAuth();

  const [
    isMobileNavigationOpen,
    setMobileNavigationOpen,
  ] = useState(false);

  // Layout horizontal só vale com o módulo BRANDING licenciado —
  // senão a empresa fica sempre na sidebar vertical (padrão).
  const horizontal =
    hasModule("BRANDING") &&
    user?.company.sidebarLayout === "horizontal";

  if (horizontal) {
    return (
      <div className="flex h-screen flex-col gap-3 bg-[var(--background)] p-3">
        <HorizontalNav />

        <TopBar
          companyName={user?.company?.tradeName}
          userName={user?.name}
          workspaceLabel={workspaceLabel}
          isMobileNavigationOpen={false}
          onMobileNavigationToggle={() => {}}
          showMobileNavigationToggle={false}
        />

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
    <div className="flex h-screen gap-3 bg-[var(--background)] p-3">
      <div
        className={
          isMobileNavigationOpen
            ? "fixed inset-0 z-40 md:static md:z-auto"
            : "hidden md:block"
        }
      >
        <Sidebar />
      </div>

      {isMobileNavigationOpen && (
        <button
          aria-label="Fechar navegação"
          onClick={() => setMobileNavigationOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
        />
      )}

      <div className="flex flex-1 flex-col gap-3">
        <TopBar
          companyName={user?.company?.tradeName}
          userName={user?.name}
          workspaceLabel={workspaceLabel}
          isMobileNavigationOpen={isMobileNavigationOpen}
          onMobileNavigationToggle={() =>
            setMobileNavigationOpen(
              (previous) => !previous
            )
          }
        />

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
