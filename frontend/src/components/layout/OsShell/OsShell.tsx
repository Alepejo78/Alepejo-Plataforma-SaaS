"use client";

import { useAuth } from "@/providers/AuthProvider";

import type { OsShellProps } from "./OsShell.types";

import { AppTabsBar } from "../TopBar";
import { TabsBar } from "../TabsBar";

/**
 * Moldura do app "OS" — guias de app + guias de telas abertas + conteúdo,
 * sem menu lateral: a navegação dentro de OS é por cards (Portal →
 * Segurança → Usuários, por ex.), não por sidebar. Substituto direto de
 * `AppShell` nas telas que vivem em OS (mesmos `children`/`workspaceLabel`
 * — este último não é mais exibido, ver `AppShell`).
 */
export function OsShell({ children }: OsShellProps) {
  const { sessionError } = useAuth();

  return (
    <div className="flex h-screen flex-col gap-3 bg-[var(--background)] p-3">
      <AppTabsBar />

      <TabsBar app="os" />

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
