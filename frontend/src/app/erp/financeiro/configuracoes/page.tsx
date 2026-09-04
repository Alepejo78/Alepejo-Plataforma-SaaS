"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Settings } from "lucide-react";

import { AppShell } from "@/components";

import {
  paymentReminderSettingsService,
  type PaymentReminderSettings,
} from "@/services/payment-reminder-settings.service";

function extractMessage(err: unknown, fallback: string) {
  const message = (
    err as { response?: { data?: { message?: unknown } } }
  )?.response?.data?.message;

  if (Array.isArray(message)) {
    return message.join(" ");
  }

  return typeof message === "string" ? message : fallback;
}

const fieldClass = `
  h-11 w-full rounded-xl border border-[var(--border)]
  bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)]
  outline-none transition-colors focus:border-[var(--primary)]
`;

export default function ConfiguracoesDeLembreteDePagamentoPage() {
  const [settings, setSettings] = useState<PaymentReminderSettings | null>(
    null
  );

  const [daysBeforeDue, setDaysBeforeDue] = useState("3");
  const [daysAfterDue, setDaysAfterDue] = useState("1");

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      const result = await paymentReminderSettingsService.get();

      setSettings(result);
      setDaysBeforeDue(String(result.daysBeforeDue));
      setDaysAfterDue(String(result.daysAfterDue));
    } catch (err) {
      setLoadError(
        extractMessage(
          err,
          "Não foi possível carregar as configurações."
        )
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    const before = Number(daysBeforeDue);
    const after = Number(daysAfterDue);

    if (!Number.isInteger(before) || before < 0) {
      setActionError("Informe um número de dias válido para o aviso antes do vencimento.");

      return;
    }

    if (!Number.isInteger(after) || after < 0) {
      setActionError("Informe um número de dias válido para o aviso de vencido.");

      return;
    }

    setSaving(true);
    setActionError("");
    setSaved(false);

    try {
      const updated = await paymentReminderSettingsService.update({
        daysBeforeDue: before,
        daysAfterDue: after,
      });

      setSettings(updated);
      setSaved(true);
    } catch (err) {
      setActionError(
        extractMessage(err, "Não foi possível salvar.")
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell workspaceLabel="Configurações do financeiro">
      <div className="space-y-6">
        <div>
          <Link
            href="/erp/financeiro/receber"
            className="mb-3 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          >
            <ArrowLeft size={16} />
            Financeiro
          </Link>

          <div className="flex items-center gap-2">
            <Settings
              size={22}
              className="text-[var(--text-secondary)]"
            />

            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              Lembrete de vencimento
            </h1>
          </div>

          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Avisa automaticamente o cliente por e-mail e WhatsApp
            quando um título a receber está perto de vencer ou já
            venceu.
          </p>
        </div>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          {loading ? (
            <div className="space-y-3">
              <div className="h-16 animate-pulse rounded-xl bg-[var(--surface-hover)]" />
              <div className="h-16 animate-pulse rounded-xl bg-[var(--surface-hover)]" />
            </div>
          ) : loadError || !settings ? (
            <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
              {loadError}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
                    Avisar quantos dias antes do vencimento
                  </label>

                  <input
                    inputMode="numeric"
                    className={fieldClass}
                    value={daysBeforeDue}
                    onChange={(e) => {
                      setDaysBeforeDue(e.target.value);
                      setSaved(false);
                    }}
                  />

                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    O cliente recebe um aviso nesse dia exato antes do
                    vencimento.
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
                    Avisar quantos dias depois de vencido
                  </label>

                  <input
                    inputMode="numeric"
                    className={fieldClass}
                    value={daysAfterDue}
                    onChange={(e) => {
                      setDaysAfterDue(e.target.value);
                      setSaved(false);
                    }}
                  />

                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    O cliente recebe um segundo aviso quando completar
                    esse número de dias vencido.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void save()}
                  className="h-11 shrink-0 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-60"
                >
                  {saving ? "Salvando..." : "Salvar"}
                </button>

                {saved && (
                  <p className="text-xs text-[var(--success)]">
                    Salvo.
                  </p>
                )}
              </div>

              {actionError && (
                <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                  {actionError}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
