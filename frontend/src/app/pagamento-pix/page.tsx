"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Copy } from "lucide-react";

import { AuthBrandHeader } from "@/components/auth/AuthBrandHeader";

import {
  entryChargePublicService,
  type EntryChargePublicInfo,
} from "@/services/entry-charge-public.service";

function extractMessage(err: unknown, fallback: string) {
  const message = (
    err as { response?: { data?: { message?: unknown } } }
  )?.response?.data?.message;

  if (Array.isArray(message)) {
    return message.join(" ");
  }

  return typeof message === "string" ? message : fallback;
}

function money(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function date(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

const PIX_KEY_TYPE_LABELS: Record<string, string> = {
  CPF: "CPF",
  CNPJ: "CNPJ",
  EMAIL: "E-mail",
  TELEFONE: "Telefone",
  ALEATORIA: "Chave aleatória",
};

function PagamentoPixContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") ?? "";
  const token = searchParams.get("token") ?? "";

  const [info, setInfo] = useState<EntryChargePublicInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const linkInvalid = !id || !token;

  useEffect(() => {
    if (linkInvalid) {
      setLoading(false);

      return;
    }

    entryChargePublicService
      .getInfo(id, token)
      .then(setInfo)
      .catch((err) => {
        setError(
          extractMessage(err, "Link inválido ou expirado. Peça um novo link.")
        );
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token]);

  async function copyKey() {
    if (!info?.pixPayload) {
      return;
    }

    try {
      await navigator.clipboard.writeText(info.pixPayload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Sem permissão de clipboard — o cliente ainda pode selecionar e copiar manualmente.
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-8">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm">
        <AuthBrandHeader
          companyLogo={info?.companyLogo}
          companyName={info?.companyName}
        />

        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Pagamento via PIX
        </h1>

        {loading ? (
          <p className="mt-4 text-sm text-[var(--text-muted)]">
            Carregando...
          </p>
        ) : linkInvalid || (error && !info) ? (
          <p className="mt-4 text-sm text-[var(--danger)]">
            {error || "Link inválido."}
          </p>
        ) : (
          info && (
            <div className="mt-4 space-y-4">
              <div className="space-y-1 rounded-xl border border-[var(--border)] p-4 text-sm">
                <p>
                  <strong>Para:</strong> {info.companyName}
                </p>

                {info.partnerName && (
                  <p>
                    <strong>Cliente:</strong> {info.partnerName}
                  </p>
                )}

                <p>
                  <strong>Vencimento:</strong> {date(info.dueDate)}
                </p>

                <p className="text-base">
                  <strong>Valor:</strong> {money(info.amount)}
                </p>
              </div>

              {info.pixQrCodeImage && (
                <div className="flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`data:image/png;base64,${info.pixQrCodeImage}`}
                    alt="QR Code PIX"
                    width={220}
                    height={220}
                    className="h-56 w-56 rounded-xl border border-[var(--border)] p-2"
                  />
                </div>
              )}

              <div className="rounded-xl border border-[var(--border)] p-4">
                {info.pixKeyType && (
                  <p className="text-xs text-[var(--text-muted)]">
                    Chave {PIX_KEY_TYPE_LABELS[info.pixKeyType]}
                  </p>
                )}

                <p className="mt-1 break-all font-mono text-sm text-[var(--text-primary)]">
                  {info.pixKey}
                </p>

                <button
                  type="button"
                  onClick={() => void copyKey()}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)]"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? "Copiado!" : "Copiar código PIX (copia e cola)"}
                </button>
              </div>

              <p className="text-center text-xs text-[var(--text-muted)]">
                Abra o app do seu banco, escolha pagar com PIX e escaneie o
                QR Code ou cole o código copiado.
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default function PagamentoPixPage() {
  return (
    <Suspense fallback={null}>
      <PagamentoPixContent />
    </Suspense>
  );
}
