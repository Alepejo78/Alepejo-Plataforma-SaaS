import { AppShell } from "@/components";

export default function Configuracoes() {
  return (
    <AppShell workspaceLabel="Configurações">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Configurações
        </h1>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--text-muted)]">
          Nada por aqui ainda.
        </section>
      </div>
    </AppShell>
  );
}
