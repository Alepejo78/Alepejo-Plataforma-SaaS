"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, MessageSquare, XCircle } from "lucide-react";

import { AuthBrandHeader } from "@/components/auth/AuthBrandHeader";

import {
  previewInstallmentInterest,
  quotePublicService,
  type QuotePaymentTiming,
  type QuotePublicInfo,
} from "@/services/quote-public.service";

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

function date(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

type Mode = "idle" | "approve" | "revise" | "cancel";

function ConfirmarOrcamentoContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") ?? "";
  const token = searchParams.get("token") ?? "";

  const [info, setInfo] = useState<QuotePublicInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const [finalStatus, setFinalStatus] = useState<
    QuotePublicInfo["status"] | null
  >(null);

  const [mode, setMode] = useState<Mode>("idle");
  const [paymentTiming, setPaymentTiming] =
    useState<QuotePaymentTiming>("A_VISTA");
  const [installmentsCount, setInstallmentsCount] = useState(2);
  const [revisionMessage, setRevisionMessage] = useState("");
  const [cancelReason, setCancelReason] = useState("");

  const linkInvalid = !id || !token;

  useEffect(() => {
    if (linkInvalid) {
      setLoading(false);

      return;
    }

    quotePublicService
      .getInfo(id, token)
      .then((result) => {
        setInfo(result);

        if (result.status !== "SENT" && result.status !== "REVISION_REQUESTED") {
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

  const interestPreview = useMemo(() => {
    if (!info || paymentTiming === "A_VISTA") {
      return 0;
    }

    return previewInstallmentInterest(
      info.netAmount,
      installmentsCount,
      info.salesSettings
    );
  }, [info, paymentTiming, installmentsCount]);

  const totalPreview = (info?.netAmount ?? 0) + interestPreview;

  async function handleApprove() {
    if (submitting) {
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await quotePublicService.approve(id, token, {
        paymentTiming,
        installmentsCount:
          paymentTiming === "A_PRAZO" ? installmentsCount : undefined,
      });

      setFinalStatus("APPROVED");
      setDone(true);
    } catch (err) {
      setError(
        extractMessage(err, "Não foi possível registrar a aprovação.")
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
      await quotePublicService.requestRevision(
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
      await quotePublicService.cancel(id, token, cancelReason.trim());

      setFinalStatus("CANCELLED");
      setDone(true);
    } catch (err) {
      setError(
        extractMessage(err, "Não foi possível cancelar o orçamento.")
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

    if (status === "APPROVED" || status === "CONVERTED") {
      return info?.purpose === "SERVICE"
        ? "Serviço autorizado! Em breve entraremos em contato para agendar a execução."
        : "Orçamento aprovado. Você vai receber o Pedido de Venda por e-mail.";
    }

    if (status === "REVISION_REQUESTED") {
      return "Pedido de revisão enviado. Aguarde um novo link com o orçamento ajustado.";
    }

    if (status === "CANCELLED") {
      return "Orçamento cancelado.";
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
          Aprovação de orçamento
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
                Confira o orçamento <strong>{info.quoteNumber}</strong> de{" "}
                <strong>{info.companyName}</strong> e decida abaixo:
              </p>

              <div className="space-y-1 rounded-xl border border-[var(--border)] p-4 text-sm">
                <p>
                  <strong>Cliente:</strong> {info.partnerName}
                </p>

                {info.validUntil && (
                  <p>
                    <strong>Válido até:</strong> {date(info.validUntil)}
                  </p>
                )}

                {info.purpose === "SERVICE" && info.serviceDescription && (
                  <p className="text-[var(--text-secondary)]">
                    {info.serviceDescription}
                  </p>
                )}

                {info.purpose === "SERVICE" ? (
                  <>
                    <div className="mt-2">
                      <p className="mb-1 font-semibold text-[var(--text-primary)]">
                        Serviços Realizados
                      </p>
                      <div className="space-y-1">
                        {info.items
                          .filter((item) => item.itemKind === "SERVICE")
                          .map((item, index) => (
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
                    </div>

                    <div className="mt-2">
                      <p className="mb-1 font-semibold text-[var(--text-primary)]">
                        Produtos e Materiais Usados
                      </p>
                      <div className="space-y-1">
                        {info.items
                          .filter((item) => item.itemKind !== "SERVICE")
                          .map((item, index) => (
                            <div
                              key={index}
                              className="flex justify-between text-[var(--text-secondary)]"
                            >
                              <span>
                                {item.quantity} × {item.description}
                              </span>
                              <span>{money(item.totalPrice)}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="mt-2 space-y-1">
                    {info.items.map((item, index) => (
                      <div
                        key={index}
                        className="flex justify-between text-[var(--text-secondary)]"
                      >
                        <span>
                          {item.quantity} × {item.description}
                        </span>
                        <span>{money(item.totalPrice)}</span>
                      </div>
                    ))}
                  </div>
                )}

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
                    onClick={() => setMode("approve")}
                    className="flex flex-col items-center gap-1 rounded-xl bg-[var(--primary)] px-3 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-60"
                  >
                    <CheckCircle2 size={18} />
                    {info.purpose === "SERVICE" ? "Autorizar serviço" : "Aprovar"}
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

              {mode === "approve" && (
                <div className="space-y-3 rounded-xl border border-[var(--border)] p-4">
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    Forma de pagamento
                  </p>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentTiming("A_VISTA")}
                      className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                        paymentTiming === "A_VISTA"
                          ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary-text)]"
                          : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                      }`}
                    >
                      À vista
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentTiming("A_PRAZO")}
                      className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                        paymentTiming === "A_PRAZO"
                          ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary-text)]"
                          : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                      }`}
                    >
                      A prazo
                    </button>
                  </div>

                  {paymentTiming === "A_PRAZO" && (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
                        Quantidade de parcelas
                      </label>

                      <select
                        className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)]"
                        value={installmentsCount}
                        onChange={(e) =>
                          setInstallmentsCount(Number(e.target.value))
                        }
                      >
                        {Array.from(
                          {
                            length: Math.max(
                              0,
                              info.salesSettings.maxInstallments - 1
                            ),
                          },
                          (_, i) => i + 2
                        ).map((n) => (
                          <option key={n} value={n}>
                            {n}x
                            {n > info.salesSettings.interestFreeInstallments
                              ? " (com juros)"
                              : " (sem juros)"}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="rounded-lg bg-[var(--surface-hover)] p-3 text-sm">
                    {interestPreview > 0 && (
                      <p className="text-[var(--text-muted)]">
                        Juros: {money(interestPreview)}
                      </p>
                    )}

                    <p className="text-base font-semibold text-[var(--text-primary)]">
                      Total: {money(totalPreview)}
                      {paymentTiming === "A_PRAZO" &&
                        ` em ${installmentsCount}x de ${money(
                          totalPreview / installmentsCount
                        )}`}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => void handleApprove()}
                      className="flex-1 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-60"
                    >
                      {submitting ? "Confirmando..." : "Confirmar aprovação"}
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

export default function ConfirmarOrcamentoPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmarOrcamentoContent />
    </Suspense>
  );
}
