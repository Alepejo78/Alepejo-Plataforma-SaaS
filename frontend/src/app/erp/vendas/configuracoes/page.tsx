"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Settings } from "lucide-react";

import { AppShell } from "@/components";

import {
  salesSettingsService,
  type SalesSettings,
} from "@/services/sales-settings.service";

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

export default function ConfiguracoesDeVendasPage() {
  const [settings, setSettings] = useState<SalesSettings | null>(null);

  const [maxInstallments, setMaxInstallments] = useState("12");
  const [interestFreeInstallments, setInterestFreeInstallments] =
    useState("3");
  const [interestRate, setInterestRate] = useState("0");

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      const result = await salesSettingsService.get();

      setSettings(result);
      setMaxInstallments(String(result.maxInstallments));
      setInterestFreeInstallments(
        String(result.interestFreeInstallments)
      );
      setInterestRate(
        String(Number(result.interestRatePerInstallment))
      );
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
    const max = Number(maxInstallments);
    const free = Number(interestFreeInstallments);
    const rate = Number(interestRate.replace(",", "."));

    if (!Number.isInteger(max) || max < 1) {
      setActionError("Informe um máximo de parcelas válido.");

      return;
    }

    if (!Number.isInteger(free) || free < 1) {
      setActionError(
        "Informe até quantas parcelas ficam sem juros."
      );

      return;
    }

    if (free > max) {
      setActionError(
        "As parcelas sem juros não podem passar do máximo de parcelas."
      );

      return;
    }

    if (!Number.isFinite(rate) || rate < 0) {
      setActionError("Informe uma taxa de juros válida.");

      return;
    }

    setSaving(true);
    setActionError("");
    setSaved(false);

    try {
      const updated = await salesSettingsService.update({
        maxInstallments: max,
        interestFreeInstallments: free,
        interestRatePerInstallment: rate,
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
    <AppShell workspaceLabel="Configurações de vendas">
      <div className="space-y-6">
        <div>
          <Link
            href="/erp/vendas/orcamentos"
            className="mb-3 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          >
            <ArrowLeft size={16} />
            Orçamentos
          </Link>

          <div className="flex items-center gap-2">
            <Settings
              size={22}
              className="text-[var(--text-secondary)]"
            />

            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              Configurações de vendas
            </h1>
          </div>

          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Regras de parcelamento oferecidas ao cliente na aprovação
            digital do orçamento (link de aprovação enviado por
            e-mail/WhatsApp).
          </p>
        </div>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          {loading ? (
            <div className="space-y-3">
              <div className="h-16 animate-pulse rounded-xl bg-[var(--surface-hover)]" />
              <div className="h-16 animate-pulse rounded-xl bg-[var(--surface-hover)]" />
              <div className="h-16 animate-pulse rounded-xl bg-[var(--surface-hover)]" />
            </div>
          ) : loadError || !settings ? (
            <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
              {loadError}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
                    Máximo de parcelas
                  </label>

                  <input
                    inputMode="numeric"
                    className={fieldClass}
                    value={maxInstallments}
                    onChange={(e) => {
                      setMaxInstallments(e.target.value);
                      setSaved(false);
                    }}
                  />

                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Quantidade máxima que o cliente pode escolher ao
                    aprovar &quot;a prazo&quot;.
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
                    Parcelas sem juros (até quantas)
                  </label>

                  <input
                    inputMode="numeric"
                    className={fieldClass}
                    value={interestFreeInstallments}
                    onChange={(e) => {
                      setInterestFreeInstallments(e.target.value);
                      setSaved(false);
                    }}
                  />

                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    1 = só à vista sem juros; acima disso, também
                    parcelado sem juros até esse número.
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
                    Juros por parcela acima do limite (%)
                  </label>

                  <input
                    inputMode="decimal"
                    className={fieldClass}
                    value={interestRate}
                    onChange={(e) => {
                      setInterestRate(e.target.value);
                      setSaved(false);
                    }}
                  />

                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Somado ao total pra cada parcela além do limite
                    sem juros (ex.: 2% em 5x com limite 3x = +4%).
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
