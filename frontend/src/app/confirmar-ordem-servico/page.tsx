"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, MessageSquare, XCircle } from "lucide-react";

import { AuthBrandHeader } from "@/components/auth/AuthBrandHeader";

import {
  serviceOrderPublicService,
  type ServiceOrderPublicInfo,
  type ServiceOrderPublicItem,
} from "@/services/service-order-public.service";

function extractMessage(err: unknown, fallback: string) {
  const message = (
    err as { response?: { data?: { message?: unknown } } }
  )?.response?.data?.message;

  if (Array.isArray(message)) {
    return message.join(" ");
  }

  return typeof message === "string" ? message : fallback;
}

function money(value: number | null | undefined) {
  return Number(value ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function ItemsList({ items }: { items: ServiceOrderPublicItem[] }) {
  if (items.length === 0) {
    return <p className="text-[var(--text-muted)]">Nenhum item.</p>;
  }

  return (
    <div className="space-y-1">
      {items.map((item, index) => (
        <div
          key={index}
          className="flex justify-between text-[var(--text-secondary)]"
        >
          <span>
            {item.quantity} × {item.description}
            {item.detail ? ` — ${item.detail}` : ""}
          </span>
          <span>{money(item.totalPrice)}</span>
        </div>
      ))}
    </div>
  );
}

type Mode = "idle" | "revise" | "cancel";

function ConfirmarOrdemServicoContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") ?? "";
  const token = searchParams.get("token") ?? "";

  const [info, setInfo] = useState<ServiceOrderPublicInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const [finalStatus, setFinalStatus] = useState<
    ServiceOrderPublicInfo["status"] | null
  >(null);

  const [mode, setMode] = useState<Mode>("idle");
  const [revisionMessage, setRevisionMessage] = useState("");
  const [cancelReason, setCancelReason] = useState("");

  const linkInvalid = !id || !token;

  useEffect(() => {
    if (linkInvalid) {
      setLoading(false);

      return;
    }

    serviceOrderPublicService
      .getInfo(id, token)
      .then((result) => {
        setInfo(result);

        if (result.status !== "AWAITING_CONFIRMATION") {
          setDone(true);
        }
      })
      .catch((err) => {
        setError(
          extractMessage(
            err,
            "Link inválido ou expirado. Peça um novo link."
          )
        );
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token]);

  async function handleConfirm() {
    if (submitting) {
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await serviceOrderPublicService.confirm(id, token);

      setFinalStatus("IN_PROGRESS");
      setDone(true);
    } catch (err) {
      setError(
        extractMessage(err, "Não foi possível registrar a confirmação.")
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRevise() {
    if (submitting || !revisionMessage.trim()) {
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await serviceOrderPublicService.requestRevision(
        id,
        token,
        revisionMessage.trim()
      );

      setFinalStatus("REVISION_REQUESTED");
      setDone(true);
    } catch (err) {
      setError(
        extractMessage(err, "Não foi possível enviar o pedido de revisão.")
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel() {
    if (submitting || !cancelReason.trim()) {
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await serviceOrderPublicService.cancel(id, token, cancelReason.trim());

      setFinalStatus("CANCELLED");
      setDone(true);
    } catch (err) {
      setError(
        extractMessage(err, "Não foi possível cancelar a ordem de serviço.")
      );
    } finally {
      setSubmitting(false);
    }
  }

  function doneMessage() {
    const status = finalStatus ?? info?.status;

    if (!status) {
      return "Obrigado. Já pode fechar esta página.";
    }

    if (status === "IN_PROGRESS") {
      return "Serviço aprovado — a execução já pode começar. Você será avisado por e-mail/WhatsApp assim que estiver pronto.";
    }

    if (status === "CONFIRMED" || status === "CONVERTED") {
      return "Serviço finalizado. Você vai receber o pedido por e-mail.";
    }

    if (status === "REVISION_REQUESTED") {
      return "Pedido de revisão enviado. Aguarde um novo link.";
    }

    if (status === "CANCELLED") {
      return "Ordem de serviço cancelada.";
    }

    return "Obrigado pela resposta.";
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-8">
      <div className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm">
        <AuthBrandHeader
          companyLogo={info?.companyLogo}
          companyName={info?.companyName}
        />

        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Aprovação de serviço
        </h1>

        {loading ? (
          <p className="mt-4 text-sm text-[var(--text-muted)]">
            Carregando...
          </p>
        ) : linkInvalid || (error && !info) ? (
          <p className="mt-4 text-sm text-[var(--danger)]">
            {error || "Link inválido. Peça um novo link."}
          </p>
        ) : done ? (
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2 text-[var(--success)]">
              <CheckCircle2 size={20} />
              <p className="text-sm font-medium">{doneMessage()}</p>
            </div>

            {finalStatus === "REVISION_REQUESTED" && revisionMessage.trim() && (
              <p className="text-sm text-[var(--text-muted)]">
                Você pediu: &quot;{revisionMessage.trim()}&quot;
              </p>
            )}

            {finalStatus === null &&
              info?.customerRevisionNote &&
              info.status === "REVISION_REQUESTED" && (
                <p className="text-sm text-[var(--text-muted)]">
                  Você pediu: &quot;{info.customerRevisionNote}&quot;
                </p>
              )}
          </div>
        ) : (
          info && (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-[var(--text-muted)]">
                Confira o serviço a ser executado na ordem{" "}
                <strong>{info.orderNumber}</strong> de{" "}
                <strong>{info.companyName}</strong> e decida abaixo — aprovando,
                a execução já começa:
              </p>

              <div className="space-y-3 rounded-xl border border-[var(--border)] p-4 text-sm">
                <p>
                  <strong>Cliente:</strong> {info.partnerName}
                </p>

                <p className="text-[var(--text-secondary)]">
                  {info.description}
                </p>

                <div>
                  <p className="mb-1 font-semibold text-[var(--text-primary)]">
                    Serviços Realizados
                  </p>
                  <ItemsList items={info.serviceItems} />
                </div>

                <div>
                  <p className="mb-1 font-semibold text-[var(--text-primary)]">
                    Produtos e Materiais Usados
                  </p>
                  <ItemsList items={info.productItems} />
                </div>

                <p className="mt-2 text-base">
                  <strong>Total:</strong> {money(info.netAmount)}
                </p>
              </div>

              {error && (
                <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                  {error}
                </div>
              )}

              {mode === "idle" && (
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => void handleConfirm()}
                    className="flex flex-col items-center gap-1 rounded-xl bg-[var(--primary)] px-3 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-60"
                  >
                    <CheckCircle2 size={18} />
                    {submitting ? "Confirmando..." : "Confirmar"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode("revise")}
                    className="flex flex-col items-center gap-1 rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                  >
                    <MessageSquare size={18} />
                    Revisar
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode("cancel")}
                    className="flex flex-col items-center gap-1 rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm font-medium text-[var(--danger)] transition-colors hover:bg-[var(--danger-soft)]"
                  >
                    <XCircle size={18} />
                    Cancelar
                  </button>
                </div>
              )}

              {mode === "revise" && (
                <div className="space-y-3 rounded-xl border border-[var(--border)] p-4">
                  <label className="block text-sm font-medium text-[var(--text-secondary)]">
                    O que precisa ser revisado?
                  </label>

                  <textarea
                    rows={4}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                    value={revisionMessage}
                    onChange={(e) => setRevisionMessage(e.target.value)}
                    placeholder="Descreva o ajuste necessário..."
                  />

                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={submitting || !revisionMessage.trim()}
                      onClick={() => void handleRevise()}
                      className="flex-1 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-60"
                    >
                      {submitting ? "Enviando..." : "Enviar"}
                    </button>

                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => setMode("idle")}
                      className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)]"
                    >
                      Voltar
                    </button>
                  </div>
                </div>
              )}

              {mode === "cancel" && (
                <div className="space-y-3 rounded-xl border border-[var(--border)] p-4">
                  <label className="block text-sm font-medium text-[var(--text-secondary)]">
                    Motivo do cancelamento
                  </label>

                  <textarea
                    rows={4}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Explique por que está cancelando..."
                  />

                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={submitting || !cancelReason.trim()}
                      onClick={() => void handleCancel()}
                      className="flex-1 rounded-xl bg-[var(--danger)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-60"
                    >
                      {submitting ? "Cancelando..." : "Confirmar cancelamento"}
                    </button>

                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => setMode("idle")}
                      className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)]"
                    >
                      Voltar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default function ConfirmarOrdemServicoPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmarOrdemServicoContent />
    </Suspense>
  );
}
