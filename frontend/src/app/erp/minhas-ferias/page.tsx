"use client";

import { useCallback, useEffect, useState } from "react";

import { AppShell } from "@/components";
import {
  vacationService,
  VACATION_STATUS_LABELS,
  type VacationGrant,
  type VacationPeriod,
} from "@/services/vacation.service";
import { PAYROLL_CONFIRMATION_STATUS_LABELS } from "@/services/payroll.service";

function extractMessage(err: unknown, fallback: string) {
  const message = (
    err as { response?: { data?: { message?: unknown } } }
  )?.response?.data?.message;

  if (Array.isArray(message)) {
    return message.join(" ");
  }

  return typeof message === "string" ? message : fallback;
}

function date(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function money(value: string | number | null | undefined) {
  return Number(value ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

const statusBadgeClass: Record<string, string> = {
  DRAFT: "bg-[var(--warning-soft)] text-[var(--warning)]",
  APPROVED: "bg-[var(--success-soft)] text-[var(--success)]",
  CANCELLED: "bg-[var(--surface-hover)] text-[var(--text-muted)]",
};

export default function MinhasFeriasPage() {
  const [periods, setPeriods] = useState<VacationPeriod[]>([]);
  const [grants, setGrants] = useState<VacationGrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [days, setDays] = useState("30");
  const [soldDays, setSoldDays] = useState("0");
  const [observation, setObservation] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [periodsResult, grantsResult] = await Promise.all([
        vacationService.getMinePeriods(),
        vacationService.getMineGrants(),
      ]);

      setPeriods(periodsResult);
      setGrants(grantsResult);
    } catch (err) {
      setError(
        extractMessage(err, "Não foi possível carregar suas férias.")
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openPeriod = periods.find((p) => p.status === "OPEN");
  const availableDays = openPeriod
    ? openPeriod.totalDays - openPeriod.usedDays - openPeriod.soldDays
    : null;

  async function handleSubmit() {
    setFormError("");
    setSuccess("");

    if (!startDate || !days) {
      setFormError("Preencha a data de início e os dias.");
      return;
    }

    setSaving(true);

    try {
      await vacationService.createMine({
        startDate,
        days: Number(days),
        soldDays: Number(soldDays) || 0,
        observation: observation || undefined,
      });

      setSuccess("Pedido enviado — aguardando aprovação do RH.");
      setFormOpen(false);
      setStartDate("");
      setDays("30");
      setSoldDays("0");
      setObservation("");
      void load();
    } catch (err) {
      setFormError(
        extractMessage(err, "Não foi possível enviar o pedido.")
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              Minhas Férias
            </h1>
            <p className="text-sm text-[var(--text-muted)]">
              Saldo, histórico e pedido de novas férias.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setFormOpen((v) => !v)}
            className="rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)]"
          >
            {formOpen ? "Cancelar" : "Pedir férias"}
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-[var(--success)] bg-[var(--success-soft)] p-3 text-sm text-[var(--success)]">
            {success}
          </div>
        )}

        {!loading && openPeriod && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="text-sm text-[var(--text-muted)]">
              Período aquisitivo aberto: {date(openPeriod.startDate)} a{" "}
              {date(openPeriod.endDate)}
            </p>
            <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
              Saldo disponível: {availableDays} dia(s)
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              Prazo concessivo: {date(openPeriod.concessiveDeadline)}
            </p>
          </div>
        )}

        {formOpen && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
                  Início
                </label>
                <input
                  type="date"
                  className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)]"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
                  Dias
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)]"
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
                  Dias vendidos (abono)
                </label>
                <input
                  type="number"
                  min={0}
                  max={10}
                  className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)]"
                  value={soldDays}
                  onChange={(e) => setSoldDays(e.target.value)}
                />
              </div>

              <div className="sm:col-span-3">
                <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
                  Observação
                </label>
                <input
                  type="text"
                  className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)]"
                  value={observation}
                  onChange={(e) => setObservation(e.target.value)}
                />
              </div>
            </div>

            {formError && (
              <p className="mt-3 text-sm text-[var(--danger)]">
                {formError}
              </p>
            )}

            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSubmit()}
              className="mt-4 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-60"
            >
              {saving ? "Enviando..." : "Enviar pedido"}
            </button>
          </div>
        )}

        {loading ? (
          <div className="h-32 animate-pulse rounded-2xl bg-[var(--surface-hover)]" />
        ) : grants.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--text-muted)]">
            Nenhum pedido de férias ainda.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--surface-hover)]">
                <tr>
                  <th className="px-4 py-2 font-medium text-[var(--text-secondary)]">
                    Período
                  </th>
                  <th className="px-4 py-2 font-medium text-[var(--text-secondary)]">
                    Líquido
                  </th>
                  <th className="px-4 py-2 font-medium text-[var(--text-secondary)]">
                    Status
                  </th>
                  <th className="px-4 py-2 font-medium text-[var(--text-secondary)]">
                    Confirmação
                  </th>
                </tr>
              </thead>
              <tbody>
                {grants.map((g) => (
                  <tr key={g.id} className="border-t border-[var(--border)]">
                    <td className="px-4 py-2 text-[var(--text-primary)]">
                      {date(g.startDate)} — {date(g.endDate)}
                    </td>
                    <td className="px-4 py-2 text-[var(--text-primary)]">
                      {money(g.netAmount)}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${statusBadgeClass[g.status] ?? ""}`}
                      >
                        {VACATION_STATUS_LABELS[g.status]}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-[var(--text-secondary)]">
                      {PAYROLL_CONFIRMATION_STATUS_LABELS[g.confirmationStatus]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
