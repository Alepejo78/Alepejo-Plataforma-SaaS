"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Copy, KeyRound, Trash2 } from "lucide-react";

import { OsShell } from "@/components";

import {
  timeClockApiKeyService,
  type TimeClockApiKeyStatus,
} from "@/services/time-tracking.service";

function extractMessage(err: unknown, fallback: string) {
  const message = (
    err as { response?: { data?: { message?: unknown } } }
  )?.response?.data?.message;

  if (Array.isArray(message)) {
    return message.join(" ");
  }

  return typeof message === "string" ? message : fallback;
}

export default function ChaveApiPontoPage() {
  const [status, setStatus] = useState<TimeClockApiKeyStatus | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [generating, setGenerating] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [copied, setCopied] = useState(false);
  const [actionError, setActionError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      const result = await timeClockApiKeyService.getStatus();

      setStatus(result);
    } catch (err) {
      setLoadError(
        extractMessage(
          err,
          "Não foi possível carregar o status da chave."
        )
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function generate() {
    setGenerating(true);
    setActionError("");
    setCopied(false);

    try {
      const result = await timeClockApiKeyService.generate();

      setNewKey(result.apiKey);

      await load();
    } catch (err) {
      setActionError(
        extractMessage(err, "Não foi possível gerar a chave.")
      );
    } finally {
      setGenerating(false);
    }
  }

  async function revoke() {
    setGenerating(true);
    setActionError("");
    setNewKey("");

    try {
      await timeClockApiKeyService.revoke();

      await load();
    } catch (err) {
      setActionError(
        extractMessage(err, "Não foi possível revogar a chave.")
      );
    } finally {
      setGenerating(false);
    }
  }

  function copyKey() {
    void navigator.clipboard.writeText(newKey);
    setCopied(true);
  }

  return (
    <OsShell workspaceLabel="Chave de API — relógio de ponto">
      <div className="space-y-6">
        <div>
          <Link
            href="/erp/rh/ponto"
            className="mb-3 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          >
            <ArrowLeft size={16} />
            Controle de ponto
          </Link>

          <div className="flex items-center gap-2">
            <KeyRound
              size={22}
              className="text-[var(--text-secondary)]"
            />

            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              Chave de API — relógio de ponto
            </h1>
          </div>

          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Use esta chave para integrar um relógio de ponto físico ou
            leitor externo de QR/código de barras. Ele deve enviar
            um <code>POST</code> para{" "}
            <code>/api/time-clock/punch</code> com o header{" "}
            <code>X-Api-Key</code> e o corpo{" "}
            <code>{"{ employeeId }"}</code> (o código de crachá
            cadastrado no colaborador, ou o id dele — codificado no
            QR/código de barras).
          </p>
        </div>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          {loading ? (
            <div className="h-20 animate-pulse rounded-xl bg-[var(--surface-hover)]" />
          ) : loadError ? (
            <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
              {loadError}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-[var(--border)] p-4">
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  Status
                </p>

                {status?.active ? (
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    Ativa —{" "}
                    <code>{status.prefix}...</code> (gerada em{" "}
                    {status.createdAt
                      ? new Date(
                          status.createdAt
                        ).toLocaleDateString("pt-BR")
                      : "—"}
                    )
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    Nenhuma chave ativa ainda.
                  </p>
                )}
              </div>

              {newKey && (
                <div className="rounded-xl border border-[var(--warning)] bg-[var(--warning-soft)] p-4">
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    Copie agora — não é possível ver esta chave de
                    novo depois.
                  </p>

                  <div className="mt-2 flex items-center gap-2">
                    <code className="flex-1 overflow-x-auto whitespace-nowrap rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm">
                      {newKey}
                    </code>

                    <button
                      type="button"
                      onClick={copyKey}
                      title="Copiar"
                      aria-label="Copiar"
                      className="rounded-lg border border-[var(--border)] p-2 text-[var(--primary)] transition-colors hover:border-[var(--primary)] hover:bg-[var(--primary-soft)]"
                    >
                      <Copy size={16} />
                    </button>
                  </div>

                  {copied && (
                    <p className="mt-1 text-xs text-[var(--success)]">
                      Copiado.
                    </p>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={generating}
                  onClick={() => void generate()}
                  className="h-11 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-60"
                >
                  {status?.active
                    ? "Gerar nova chave (substitui a atual)"
                    : "Gerar chave"}
                </button>

                {status?.active && (
                  <button
                    type="button"
                    disabled={generating}
                    onClick={() => void revoke()}
                    className="flex h-11 items-center gap-2 rounded-xl border border-[var(--border)] px-5 text-sm font-medium text-[var(--danger)] transition-colors hover:border-[var(--danger)] hover:bg-[var(--danger-soft)] disabled:opacity-60"
                  >
                    <Trash2 size={16} />
                    Revogar
                  </button>
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
    </OsShell>
  );
}
