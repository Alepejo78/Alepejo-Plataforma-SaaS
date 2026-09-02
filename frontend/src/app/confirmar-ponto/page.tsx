"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

import { AuthBrandHeader } from "@/components/auth/AuthBrandHeader";

import {
  timeEntryConfirmationPublicService,
  type TimeEntryConfirmationPublicInfo,
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

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function ConfirmarPontoContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") ?? "";
  const token = searchParams.get("token") ?? "";

  const [info, setInfo] = useState<TimeEntryConfirmationPublicInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);

  const linkInvalid = !id || !token;

  useEffect(() => {
    if (linkInvalid) {
      setLoading(false);

      return;
    }

    timeEntryConfirmationPublicService
      .getInfo(id, token)
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
  }, [id, token]);

  async function handleConfirm() {
    if (confirming) {
      return;
    }

    setConfirming(true);
    setError("");

    try {
      await timeEntryConfirmationPublicService.confirm(id, token);

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
      <div className="w-full max-w-2xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm">
        <AuthBrandHeader
          companyLogo={info?.companyLogo}
          companyName={info?.companyName}
        />

        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Confirmação de ponto
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
                Ponto confirmado com sucesso.
              </p>
            </div>

            <p className="text-sm text-[var(--text-muted)]">
              Obrigado, {info?.employeeName}. Já pode fechar esta página.
            </p>
          </div>
        ) : (
          info && (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-[var(--text-muted)]">
                Confira o ponto de{" "}
                <strong>
                  {MONTH_NAMES[info.month - 1]}/{info.year}
                </strong>{" "}
                abaixo, gerado por <strong>{info.companyName}</strong>, e
                confirme que está de acordo:
              </p>

              <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[var(--surface-hover)]">
                    <tr>
                      <th className="px-2 py-1.5">Data</th>
                      <th className="px-2 py-1.5">Entrada</th>
                      <th className="px-2 py-1.5">Int. início</th>
                      <th className="px-2 py-1.5">Int. fim</th>
                      <th className="px-2 py-1.5">Saída</th>
                      <th className="px-2 py-1.5">Trabalhadas</th>
                      <th className="px-2 py-1.5">Extras</th>
                    </tr>
                  </thead>
                  <tbody>
                    {info.days.map((d, i) => (
                      <tr key={i} className="border-t border-[var(--border)]">
                        <td className="px-2 py-1.5">{d.dateLabel}</td>
                        <td className="px-2 py-1.5">{d.start}</td>
                        <td className="px-2 py-1.5">{d.breakStart}</td>
                        <td className="px-2 py-1.5">{d.breakEnd}</td>
                        <td className="px-2 py-1.5">{d.end}</td>
                        <td className="px-2 py-1.5">{d.workedLabel}</td>
                        <td className="px-2 py-1.5">{d.extraLabel}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                {confirming ? "Confirmando..." : "Confirmar recebimento"}
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default function ConfirmarPontoPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmarPontoContent />
    </Suspense>
  );
}
