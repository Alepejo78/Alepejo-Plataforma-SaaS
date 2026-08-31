"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Factory } from "lucide-react";

import { OsShell } from "@/components";

import {
  productionSettingsService,
  type ProductionSettings,
} from "@/services/production.service";

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

function Switch({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors disabled:opacity-60 ${
        checked
          ? "border-[var(--primary)] bg-[var(--primary)]"
          : "border-[var(--border-strong)] bg-[var(--surface-hover)]"
      }`}
    >
      <span
        className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
  disabled,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {title}
          </p>

          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            {description}
          </p>
        </div>

        <Switch
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          label={title}
        />
      </div>
    </div>
  );
}

export default function ConfiguracoesDeProducaoPage() {
  const [settings, setSettings] = useState<ProductionSettings | null>(
    null
  );
  const [minBatchSize, setMinBatchSize] = useState("1");

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [updating, setUpdating] = useState(false);
  const [actionError, setActionError] = useState("");
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      const result = await productionSettingsService.get();

      setSettings(result);
      setMinBatchSize(String(Number(result.minBatchSize)));
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

  async function saveToggle(patch: {
    autoGenerateOnSalesOrder?: boolean;
    autoGenerateOnLowStock?: boolean;
  }) {
    setUpdating(true);
    setActionError("");

    try {
      const updated = await productionSettingsService.update(patch);

      setSettings(updated);
    } catch (err) {
      setActionError(
        extractMessage(err, "Não foi possível salvar.")
      );
    } finally {
      setUpdating(false);
    }
  }

  async function saveMinBatchSize() {
    const parsed = Number(
      minBatchSize.replace(/\./g, "").replace(",", ".")
    );

    if (!Number.isFinite(parsed) || parsed <= 0) {
      setActionError("Informe um lote mínimo maior que zero.");

      return;
    }

    setUpdating(true);
    setActionError("");
    setSaved(false);

    try {
      const updated = await productionSettingsService.update({
        minBatchSize: parsed,
      });

      setSettings(updated);
      setSaved(true);
    } catch (err) {
      setActionError(
        extractMessage(err, "Não foi possível salvar.")
      );
    } finally {
      setUpdating(false);
    }
  }

  return (
    <OsShell workspaceLabel="Configurações de produção">
      <div className="space-y-6">
        <div>
          <Link
            href="/erp/producao/ordens"
            className="mb-3 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          >
            <ArrowLeft size={16} />
            Ordens de produção
          </Link>

          <div className="flex items-center gap-2">
            <Factory
              size={22}
              className="text-[var(--text-secondary)]"
            />

            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              Configurações de produção
            </h1>
          </div>
        </div>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          {loading ? (
            <div className="space-y-3">
              <div className="h-20 animate-pulse rounded-xl bg-[var(--surface-hover)]" />
              <div className="h-20 animate-pulse rounded-xl bg-[var(--surface-hover)]" />
              <div className="h-20 animate-pulse rounded-xl bg-[var(--surface-hover)]" />
            </div>
          ) : loadError || !settings ? (
            <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
              {loadError}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-[var(--border)] p-4">
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  Lote mínimo por ordem de produção
                </p>

                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                  Quando uma ordem nasce sozinha, nunca gera menos
                  do que esse tanto — evita ordem de 1 unidade por
                  causa de uma venda pequena. Um produto específico
                  pode ter seu próprio lote mínimo (cadastro de
                  Produtos), que sobrepõe este valor padrão.
                </p>

                <div className="mt-3 flex gap-3">
                  <input
                    inputMode="decimal"
                    className={`${fieldClass} max-w-xs`}
                    value={minBatchSize}
                    onChange={(e) => {
                      setMinBatchSize(e.target.value);
                      setSaved(false);
                    }}
                  />

                  <button
                    type="button"
                    disabled={updating}
                    onClick={() => void saveMinBatchSize()}
                    className="h-11 shrink-0 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-60"
                  >
                    {updating ? "Salvando..." : "Salvar"}
                  </button>
                </div>

                {saved && (
                  <p className="mt-2 text-xs text-[var(--success)]">
                    Salvo.
                  </p>
                )}
              </div>

              <ToggleRow
                title="Gerar ordem ao faltar saldo numa venda ou pedido"
                description="Se um pedido de venda pedir mais do que o saldo disponível, ou se uma venda for lançada mesmo com estoque insuficiente, gera uma ordem de produção sozinha pela diferença."
                checked={settings.autoGenerateOnSalesOrder}
                disabled={updating}
                onChange={(value) =>
                  void saveToggle({
                    autoGenerateOnSalesOrder: value,
                  })
                }
              />

              <ToggleRow
                title="Gerar ordem quando o estoque chegar ao mínimo"
                description="Depois de qualquer saída de estoque, se o saldo total do produto (somando todos os depósitos) chegar ao mínimo cadastrado, gera uma ordem de produção sozinha."
                checked={settings.autoGenerateOnLowStock}
                disabled={updating}
                onChange={(value) =>
                  void saveToggle({
                    autoGenerateOnLowStock: value,
                  })
                }
              />

              {actionError && (
                <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                  {actionError}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </OsShell>
  );
}
