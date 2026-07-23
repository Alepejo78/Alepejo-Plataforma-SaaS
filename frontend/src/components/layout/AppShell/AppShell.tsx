import type { AppShellProps } from "./AppShell.types";

import { Sidebar } from "@/components";

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen bg-[var(--background)] p-3 gap-3">

      <Sidebar />

      <div className="flex flex-1 flex-col gap-3">

        <header className="
          h-16
          rounded-3xl
          border
          border-[var(--border)]
          bg-[var(--surface)]
          px-8
          flex
          items-center
          shadow-sm
        ">

          <h2 className="font-semibold text-[var(--text-primary)]">
            AlePejo ERP Cloud
          </h2>

        </header>

        <main
          className="
            flex-1
            overflow-auto
            rounded-3xl
            bg-[var(--surface)]
            border
            border-[var(--border)]
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