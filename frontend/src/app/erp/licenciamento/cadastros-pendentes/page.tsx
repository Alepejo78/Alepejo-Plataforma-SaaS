"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Search, Send, ShieldOff } from "lucide-react";

import { OsShell } from "@/components";
import { ListPageLayout } from "@/components/layout/ListPageLayout";
import { useAuth } from "@/providers/AuthProvider";

import {
  companyOnboardingService,
  type PendingCheckout,
} from "@/services/company-onboarding.service";

function money(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function date(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function extractMessage(err: unknown, fallback: string) {
  const message = (
    err as { response?: { data?: { message?: unknown } } }
  )?.response?.data?.message;

  if (Array.isArray(message)) {
    return message.join(" ");
  }

  return typeof message === "string" ? message : fallback;
}

const CYCLE_LABELS: Record<"MONTHLY" | "YEARLY", string> = {
  MONTHLY: "Mensal",
  YEARLY: "Anual",
};

export default function CadastrosPendentesPage() {
  const { can } = useAuth();
  const allowed = can("platform.license.manage");

  const [email, setEmail] = useState("");
  const [rows, setRows] = useState<PendingCheckout[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendingId, setResendingId] = useState("");
  const [resendResult, setResendResult] = useState<{
    id: string;
    message: string;
    ok: boolean;
  } | null>(null);

  async function search() {
    if (!email.trim()) {
      return;
    }

    setLoading(true);
    setError("");
    setResendResult(null);

    try {
      const result = await companyOnboardingService.findPendingCheckouts(
        email.trim()
      );
      setRows(result);
      setSearched(true);
    } catch (err) {
      setError(
        extractMessage(err, "Não foi possível buscar a compra.")
      );
    } finally {
      setLoading(false);
    }
  }

  async function resend(checkout: PendingCheckout) {
    setResendingId(checkout.id);
    setResendResult(null);

    try {
      const result = await companyOnboardingService.resendPendingCheckout(
        checkout.id
      );

      // O reenvio renova o prazo — busca de novo pra mostrar a validade
      // certa, mas SEM usar `search()` (que limpa `resendResult` ao
      // começar) pra não sumir com a mensagem de sucesso que acabou de
      // ser definida logo abaixo.
      const refreshed = await companyOnboardingService.findPendingCheckouts(
        email.trim()
      );
      setRows(refreshed);

      setResendResult({
        id: checkout.id,
        ok: result.sent,
        message: result.sent
          ? `Link reenviado (${result.channels
              .map((c) => (c === "email" ? "e-mail" : "WhatsApp"))
              .join(" e ")}).`
          : "O cliente não tem e-mail nem celular cadastrado — não deu para enviar.",
      });
    } catch (err) {
      setResendResult({
        id: checkout.id,
        ok: false,
        message: extractMessage(err, "Não foi possível reenviar o link."),
      });
    } finally {
      setResendingId("");
    }
  }

  if (!allowed) {
    return (
      <OsShell workspaceLabel="Cadastros pendentes">
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-[var(--border)] p-12 text-center">
          <ShieldOff size={32} className="text-[var(--text-muted)]" />

          <p className="font-medium text-[var(--text-primary)]">
            Acesso restrito
          </p>

          <p className="max-w-sm text-sm text-[var(--text-muted)]">
            Esta área é exclusiva da administração da plataforma.
          </p>
        </div>
      </OsShell>
    );
  }

  return (
    <OsShell workspaceLabel="Cadastros pendentes">
      <ListPageLayout
        header={
          <>
            <Link
              href="/os"
              className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            >
              <ArrowLeft size={16} />
              Voltar para Configurações
            </Link>

            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                Cadastros pendentes
              </h1>

              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Cliente pagou o plano em /planos mas fechou a página antes
                de terminar o cadastro da empresa — busque pelo e-mail
                usado na compra e reenvie o link pra ele finalizar.
              </p>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1 max-w-md">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                />

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      void search();
                    }
                  }}
                  placeholder="E-mail usado na compra..."
                  className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] pl-9 pr-3 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--primary)]"
                />
              </div>

              <button
                type="button"
                disabled={loading || !email.trim()}
                onClick={() => void search()}
                className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-60"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                Buscar
              </button>
            </div>

            {error && (
              <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                {error}
              </div>
            )}
          </>
        }
      >
        {!searched ? (
          <div className="p-12 text-center">
            <p className="font-medium text-[var(--text-primary)]">
              Digite o e-mail do cliente e clique em Buscar
            </p>
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-medium text-[var(--text-primary)]">
              Nenhuma compra pendente encontrada
            </p>

            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Ou já virou empresa (confira em Clientes e faturamento), ou
              o e-mail não bate com o usado na compra.
            </p>
          </div>
        ) : (
          <div className="space-y-3 p-4">
            {rows.map((row) => (
              <div
                key={row.id}
                className="rounded-2xl border border-[var(--border)] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">
                      {row.name}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {row.document} · {row.email}
                      {row.phone ? ` · ${row.phone}` : ""}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="font-semibold text-[var(--text-primary)]">
                      {money(row.value)}{" "}
                      <span className="font-normal text-[var(--text-muted)]">
                        / {CYCLE_LABELS[row.billingCycle]}
                      </span>
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      Plano {row.planName}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-3">
                  <div className="text-xs text-[var(--text-muted)]">
                    <span
                      className={
                        row.paid
                          ? "font-medium text-[var(--success)]"
                          : "font-medium text-[var(--danger)]"
                      }
                    >
                      {row.paid ? "Pago" : "Aguardando pagamento"}
                    </span>
                    {" · "}
                    Comprou em {date(row.createdAt)}
                    {" · "}
                    {row.expired ? (
                      <span className="font-medium text-[var(--danger)]">
                        Link expirado em {date(row.expiresAt)}
                      </span>
                    ) : (
                      <>Link válido até {date(row.expiresAt)}</>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={resendingId === row.id}
                    onClick={() => void resend(row)}
                    className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--primary)] transition-colors hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] disabled:opacity-60"
                  >
                    {resendingId === row.id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Send size={16} />
                    )}
                    Reenviar link pro cliente
                  </button>
                </div>

                {resendResult?.id === row.id && (
                  <p
                    className={`mt-2 text-sm ${
                      resendResult.ok
                        ? "text-[var(--success)]"
                        : "text-[var(--danger)]"
                    }`}
                  >
                    {resendResult.message}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </ListPageLayout>
    </OsShell>
  );
}
