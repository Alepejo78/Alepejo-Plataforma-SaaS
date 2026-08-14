"use client";

import { OsShell } from "@/components";

export default function OsPortalPage() {
  return (
    <OsShell workspaceLabel="Portal">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Portal
        </h1>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--text-muted)]">
          Em breve.
        </section>
      </div>
    </OsShell>
  );
}
