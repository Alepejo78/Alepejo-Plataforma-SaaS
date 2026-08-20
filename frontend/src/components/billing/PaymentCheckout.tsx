"use client";

import { useState } from "react";
import {
  Barcode,
  CheckCircle2,
  Copy,
  CreditCard,
  Loader2,
  QrCode,
  Wallet,
} from "lucide-react";

import {
  billingService,
  type BillingType,
  type SubscribeResult,
} from "@/services/billing.service";

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

function formatDate(value?: string | null) {
  if (!value) {
    return null;
  }

  return new Date(value).toLocaleDateString("pt-BR");
}

const BILLING_OPTIONS: {
  value: BillingType;
  label: string;
  icon: typeof QrCode;
}[] = [
  { value: "PIX", label: "PIX", icon: QrCode },
  { value: "BOLETO", label: "Boleto", icon: Barcode },
  { value: "CREDIT_CARD", label: "Cartão de crédito", icon: CreditCard },
  { value: "UNDEFINED", label: "Escolher na fatura", icon: Wallet },
];

/**
 * Escolha da forma de pagamento + geração da cobrança no Asaas +
 * exibição do resultado (PIX copia-e-cola, link de boleto/fatura).
 * Extraído do `ContractModal` de `/erp/licenciamento` (autenticado,
 * "Contratar") pra ser reaproveitado também logo após o cadastro
 * público com pagamento imediato (`/cadastro-empresa?payNow=1`) — nos
 * dois casos a sessão já existe, então `billingService.subscribe()`
 * funciona igual.
 */
export function PaymentCheckout({
  onCharged,
  finalLabel,
  onFinal,
  charge,
  submitLabel = "Gerar cobrança",
}: {
  /** Chamado assim que a cobrança é gerada (antes de mostrar o resultado) — ex.: atualizar dados da licença/sessão. */
  onCharged?: (result: SubscribeResult) => void;
  /** Texto do botão final, depois da cobrança gerada. */
  finalLabel: string;
  onFinal: () => void;
  /**
   * Como gerar a cobrança. Sem isso, usa a assinatura da empresa
   * logada (`/billing/me/subscribe`, tela de Licenciamento); a compra
   * pública de /planos passa a sua própria função, que fala com o
   * endpoint de checkout (sem sessão).
   */
  charge?: (billingType: BillingType) => Promise<SubscribeResult>;
  submitLabel?: string;
}) {
  const [billingType, setBillingType] = useState<BillingType>("PIX");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SubscribeResult | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubscribe() {
    setLoading(true);
    setError("");

    try {
      const data = charge
        ? await charge(billingType)
        : await billingService.subscribe(billingType);

      setResult(data);
      onCharged?.(data);
    } catch (err) {
      setError(
        extractMessage(
          err,
          "Não foi possível gerar a cobrança. Tente novamente."
        )
      );
    } finally {
      setLoading(false);
    }
  }

  function copyPix() {
    if (!result?.pixPayload) {
      return;
    }

    void navigator.clipboard.writeText(result.pixPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!result) {
    return (
      <div className="space-y-6">
        <p className="text-sm text-[var(--text-muted)]">
          Escolha como prefere pagar. A cobrança é gerada no Asaas —
          assim que confirmado, sua assinatura fica ativa automaticamente.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {BILLING_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setBillingType(option.value)}
              className={`rounded-2xl border p-5 text-left transition-colors ${
                billingType === option.value
                  ? "border-[var(--primary)] bg-[var(--primary)]/5"
                  : "border-[var(--border)] hover:border-[var(--border-strong)]"
              }`}
            >
              <option.icon size={20} className="mb-2 text-[var(--primary)]" />
              <p className="font-medium text-[var(--text-primary)]">
                {option.label}
              </p>
            </button>
          ))}
        </div>

        {error && (
          <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
            {error}
          </div>
        )}

        <button
          type="button"
          disabled={loading}
          onClick={() => void handleSubscribe()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-60"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading ? "Gerando cobrança..." : submitLabel}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-[var(--success)]">
        <CheckCircle2 size={20} />
        <p className="text-sm font-medium">Cobrança gerada.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-[var(--border)] p-4">
          <p className="text-xs text-[var(--text-muted)]">Valor</p>
          <p className="text-xl font-bold text-[var(--text-primary)]">
            {money(result.value)}
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border)] p-4">
          <p className="text-xs text-[var(--text-muted)]">Vencimento</p>
          <p className="text-xl font-bold text-[var(--text-primary)]">
            {formatDate(result.dueDate)}
          </p>
        </div>
      </div>

      {result.pixPayload && (
        <div className="rounded-xl border border-[var(--border)] p-4">
          <p className="mb-2 text-sm font-medium text-[var(--text-primary)]">
            Código PIX copia e cola
          </p>

          <div className="flex items-center gap-2">
            <code className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap rounded-lg bg-[var(--background)] px-3 py-2 text-xs text-[var(--text-secondary)]">
              {result.pixPayload}
            </code>

            <button
              type="button"
              onClick={copyPix}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
            >
              <Copy size={14} />
              {copied ? "Copiado!" : "Copiar"}
            </button>
          </div>
        </div>
      )}

      {(result.invoiceUrl || result.bankSlipUrl) && (
        <a
          href={result.bankSlipUrl || result.invoiceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-5 py-3 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
        >
          <CreditCard size={16} />
          {result.bankSlipUrl ? "Abrir boleto" : "Abrir fatura"}
        </a>
      )}

      <button
        type="button"
        onClick={onFinal}
        className="w-full rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)]"
      >
        {finalLabel}
      </button>
    </div>
  );
}
