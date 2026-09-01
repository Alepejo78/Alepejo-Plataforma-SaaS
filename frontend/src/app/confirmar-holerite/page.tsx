"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

import { AuthBrandHeader } from "@/components/auth/AuthBrandHeader";

import {
  payrollConfirmationPublicService,
  type PayrollPublicInfo,
} from "@/services/payroll.service";

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

  return new Date(value).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
  });
}

function ConfirmarHoleriteContent() {
  const searchParams = useSearchParams();
  const payrollId = searchParams.get("payrollId") ?? "";
  const itemId = searchParams.get("itemId") ?? "";
  const token = searchParams.get("token") ?? "";

  const [info, setInfo] = useState<PayrollPublicInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);

  const linkInvalid = !payrollId || !itemId || !token;

  useEffect(() => {
    if (linkInvalid) {
      setLoading(false);

      return;
    }

    payrollConfirmationPublicService
      .getInfo(payrollId, itemId, token)
      .then((result) => {
        setInfo(result);

        if (result.status === "CONFIRMADO") {
          setDone(true);
        }
      })
      .catch((err) => {
        setError(
          extractMessage(
            err,
            "Link inválido ou expirado. Peça um novo link ao RH."
          )
        );
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payrollId, itemId, token]);

  async function handleConfirm() {
    if (confirming) {
      return;
    }

    setConfirming(true);
    setError("");

    try {
      await payrollConfirmationPublicService.confirm(
        payrollId,
        itemId,
        token
      );

      setDone(true);
    } catch (err) {
      setError(
        extractMessage(
          err,
          "Não foi possível confirmar. Peça um novo link ao RH."
        )
      );
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-8">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm">
        <AuthBrandHeader />

        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Confirmação de recebimento de holerite
        </h1>

        {loading ? (
          <p className="mt-4 text-sm text-[var(--text-muted)]">
            Carregando...
          </p>
        ) : linkInvalid || (error && !info) ? (
          <p className="mt-4 text-sm text-[var(--danger)]">
            {error || "Link inválido. Peça um novo link ao RH."}
          </p>
        ) : done ? (
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2 text-[var(--success)]">
              <CheckCircle2 size={20} />
              <p className="text-sm font-medium">
                Recebimento confirmado com sucesso.
              </p>
            </div>

            <p className="text-sm text-[var(--text-muted)]">
              Obrigado, {info?.employeeName}. Já pode fechar esta
              página.
            </p>
          </div>
        ) : (
          info && (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-[var(--text-muted)]">
                Confirme que você recebeu o holerite abaixo, gerado
                por <strong>{info.companyName}</strong>:
              </p>

              <div className="space-y-1 rounded-xl border border-[var(--border)] p-4 text-sm">
                <p>
                  <strong>Colaborador:</strong>{" "}
                  {info.employeeName}
                </p>
                <p>
                  <strong>Competência:</strong> {info.competence}
                </p>
                <p>
                  <strong>Proventos:</strong>{" "}
                  {money(info.grossAmount)}
                </p>
                <p>
                  <strong>Descontos:</strong>{" "}
                  {money(info.totalDeductions)}
                </p>
                <p>
                  <strong>Líquido:</strong> {money(info.netAmount)}
                </p>
                {info.paymentDate && (
                  <p>
                    <strong>Data de pagamento:</strong>{" "}
                    {date(info.paymentDate)}
                  </p>
                )}
              </div>

              {error && (
                <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                  {error}
                </div>
              )}

              <button
                type="button"
                disabled={confirming}
                onClick={() => void handleConfirm()}
                className="w-full rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-60"
              >
                {confirming
                  ? "Confirmando..."
                  : "Confirmar recebimento"}
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default function ConfirmarHoleritePage() {
  return (
    <Suspense fallback={null}>
      <ConfirmarHoleriteContent />
    </Suspense>
  );
}
