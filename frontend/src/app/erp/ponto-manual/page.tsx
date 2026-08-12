"use client";

import { useCallback, useEffect, useState } from "react";
import { Clock } from "lucide-react";

import { AppShell } from "@/components";

import { employeeService, type Employee } from "@/services/hr.service";
import { timeEntryService } from "@/services/time-tracking.service";

function extractMessage(err: unknown, fallback: string) {
  const message = (
    err as { response?: { data?: { message?: unknown } } }
  )?.response?.data?.message;

  if (Array.isArray(message)) {
    return message.join(" ");
  }

  return typeof message === "string" ? message : fallback;
}

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

const fieldClass = `
  h-11 w-full rounded-xl border border-[var(--border)]
  bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)]
  outline-none transition-colors focus:border-[var(--primary)]
`;

const labelClass =
  "mb-1 block text-sm font-medium text-[var(--text-secondary)]";

function emptyForm() {
  return {
    date: todayInput(),
    start: "",
    breakStart: "",
    breakEnd: "",
    end: "",
  };
}

export default function PontoManualPage() {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [linkError, setLinkError] = useState("");

  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setLinkError("");

    try {
      const result = await employeeService.getMine();

      setEmployee(result);
    } catch (err) {
      setLinkError(
        extractMessage(
          err,
          "Seu usuário ainda não está vinculado a um colaborador."
        )
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit() {
    if (
      !form.date ||
      !form.start ||
      !form.breakStart ||
      !form.breakEnd ||
      !form.end
    ) {
      setFormError(
        "Preencha a data e os 4 horários — todos são obrigatórios."
      );

      return;
    }

    setSaving(true);
    setFormError("");
    setSuccess("");

    try {
      await timeEntryService.selfReport(form);

      setSuccess(
        `Lançamento registrado pra ${new Date(`${form.date}T00:00:00`).toLocaleDateString("pt-BR", { timeZone: "UTC" })} — entrou no Controle de Ponto aguardando aprovação.`
      );
      setForm(emptyForm());
    } catch (err) {
      setFormError(
        extractMessage(
          err,
          "Não foi possível registrar o lançamento."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell workspaceLabel="Ponto - Manual">
      <div className="mx-auto max-w-2xl space-y-6">
        <header>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-[var(--text-primary)]">
            <Clock size={22} />
            Ponto - Manual
          </h1>

          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Esqueceu de bater o ponto? Lance aqui o seu próprio dia —
            entra na folha de ponto aguardando aprovação, igual uma
            batida normal. Só é possível lançar o seu próprio dia.
          </p>
        </header>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          {loading ? (
            <div className="h-40 animate-pulse rounded-xl bg-[var(--surface-hover)]" />
          ) : linkError ? (
            <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-4 text-sm text-[var(--danger)]">
              {linkError}
            </div>
          ) : (
            <>
              <p className="mb-4 text-sm text-[var(--text-secondary)]">
                Colaborador:{" "}
                <span className="font-medium text-[var(--text-primary)]">
                  {employee?.name}
                </span>
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={labelClass}>Data</label>

                  <input
                    type="date"
                    className={fieldClass}
                    value={form.date}
                    onChange={(e) =>
                      setForm({ ...form, date: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className={labelClass}>Início</label>

                  <input
                    type="time"
                    className={fieldClass}
                    value={form.start}
                    onChange={(e) =>
                      setForm({ ...form, start: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Início do intervalo
                  </label>

                  <input
                    type="time"
                    className={fieldClass}
                    value={form.breakStart}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        breakStart: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Fim do intervalo
                  </label>

                  <input
                    type="time"
                    className={fieldClass}
                    value={form.breakEnd}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        breakEnd: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className={labelClass}>Saída</label>

                  <input
                    type="time"
                    className={fieldClass}
                    value={form.end}
                    onChange={(e) =>
                      setForm({ ...form, end: e.target.value })
                    }
                  />
                </div>
              </div>

              {formError && (
                <div className="mt-4 rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                  {formError}
                </div>
              )}

              {success && (
                <div className="mt-4 rounded-xl border border-[var(--success)] bg-[var(--success-soft)] p-3 text-sm text-[var(--success)]">
                  {success}
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void submit()}
                  className="rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] disabled:opacity-60"
                >
                  {saving ? "Salvando..." : "Lançar ponto"}
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </AppShell>
  );
}
