"use client";

import { useState } from "react";

import { useAuth } from "@/providers/AuthProvider";

import type { AppShellProps } from "./AppShell.types";

import { Sidebar } from "../Sidebar";
import { TopBar } from "../TopBar";

export function AppShell({
  children,
  workspaceLabel,
}: AppShellProps) {
  const { user, sessionError } = useAuth();

  const [
    isMobileNavigationOpen,
    setMobileNavigationOpen,
  ] = useState(false);

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
          className="fixed inset-0 z-30 bg-[var(--primary)]/40 md:hidden"
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
            overflow-auto
            rounded-3xl
            border
            border-[var(--border)]
            bg-[var(--surface)]
            p-8
            shadow-sm
          "
        >
          {children}
        </main>
      </div>
    </div>
  );
}
