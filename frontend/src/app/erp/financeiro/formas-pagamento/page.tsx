"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CreditCard, RefreshCw } from "lucide-react";

import { AppShell } from "@/components";
import { env } from "@/lib/env";

import {
  paymentMethodSettingsService,
  type PaymentMethodSettings,
  type SurchargeType,
} from "@/services/payment-method-settings.service";
import {
  bankAccountService,
  type BankAccount,
} from "@/services/bank-account.service";

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

const labelClass =
  "mb-1 block text-sm font-medium text-[var(--text-secondary)]";

const sectionClass =
  "rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 space-y-4";

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

interface SurchargeFields {
  type: string;
  value: string;
}

function SurchargeInputs({
  label,
  helper,
  fields,
  onChange,
}: {
  label: string;
  helper: string;
  fields: SurchargeFields;
  onChange: (fields: SurchargeFields) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className={labelClass}>{label}</label>

        <select
          className={fieldClass}
          value={fields.type}
          onChange={(e) =>
            onChange({ ...fields, type: e.target.value })
          }
        >
          <option value="">Sem acréscimo</option>
          <option value="PERCENT">% sobre o valor</option>
          <option value="FIXED">Valor fixo (R$)</option>
        </select>

        <p className="mt-1 text-xs text-[var(--text-muted)]">{helper}</p>
      </div>

      <div>
        <label className={labelClass}>Valor</label>

        <input
          inputMode="decimal"
          className={fieldClass}
          disabled={!fields.type}
          value={fields.value}
          onChange={(e) =>
            onChange({ ...fields, value: e.target.value })
          }
        />
      </div>
    </div>
  );
}

export default function FormasDePagamentoPage() {
  const [settings, setSettings] = useState<PaymentMethodSettings | null>(
    null
  );
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

  const [asaasEnabled, setAsaasEnabled] = useState(false);
  const [asaasApiKey, setAsaasApiKey] = useState("");
  const [asaasSandbox, setAsaasSandbox] = useState(true);
  const [defaultBankAccountId, setDefaultBankAccountId] = useState("");

  const [boleto, setBoleto] = useState<SurchargeFields>({
    type: "",
    value: "0",
  });
  const [transfer, setTransfer] = useState<SurchargeFields>({
    type: "",
    value: "0",
  });
  const [pix, setPix] = useState<SurchargeFields>({ type: "", value: "0" });
  const [card, setCard] = useState<SurchargeFields>({
    type: "",
    value: "0",
  });

  const [cardMaxInstallments, setCardMaxInstallments] = useState("12");
  const [cardInterestFreeInstallments, setCardInterestFreeInstallments] =
    useState("1");
  const [cardInterestRate, setCardInterestRate] = useState("0");

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const [saved, setSaved] = useState(false);

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      const [result, accounts] = await Promise.all([
        paymentMethodSettingsService.get(),
        bankAccountService.list(),
      ]);

      setSettings(result);
      setBankAccounts(accounts);

      setAsaasEnabled(result.asaasEnabled);
      setAsaasSandbox(result.asaasSandbox);
      setDefaultBankAccountId(result.defaultBankAccountId ?? "");

      setBoleto({
        type: result.boletoSurchargeType ?? "",
        value: String(Number(result.boletoSurchargeValue)),
      });
      setTransfer({
        type: result.transferSurchargeType ?? "",
        value: String(Number(result.transferSurchargeValue)),
      });
      setPix({
        type: result.pixSurchargeType ?? "",
        value: String(Number(result.pixSurchargeValue)),
      });
      setCard({
        type: result.cardSurchargeType ?? "",
        value: String(Number(result.cardSurchargeValue)),
      });

      setCardMaxInstallments(String(result.cardMaxInstallments));
      setCardInterestFreeInstallments(
        String(result.cardInterestFreeInstallments)
      );
      setCardInterestRate(
        String(Number(result.cardInterestRatePerInstallment))
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
    setSaving(true);
    setActionError("");
    setSaved(false);
    setTestResult(null);

    try {
      const updated = await paymentMethodSettingsService.update({
        asaasEnabled,
        ...(asaasApiKey && { asaasApiKey }),
        asaasSandbox,
        defaultBankAccountId: defaultBankAccountId || null,
        boletoSurchargeType: (boleto.type || null) as SurchargeType | null,
        boletoSurchargeValue: Number(boleto.value.replace(",", ".")) || 0,
        transferSurchargeType: (transfer.type || null) as
          | SurchargeType
          | null,
        transferSurchargeValue:
          Number(transfer.value.replace(",", ".")) || 0,
        pixSurchargeType: (pix.type || null) as SurchargeType | null,
        pixSurchargeValue: Number(pix.value.replace(",", ".")) || 0,
        cardSurchargeType: (card.type || null) as SurchargeType | null,
        cardSurchargeValue: Number(card.value.replace(",", ".")) || 0,
        cardMaxInstallments: Number(cardMaxInstallments) || 1,
        cardInterestFreeInstallments:
          Number(cardInterestFreeInstallments) || 0,
        cardInterestRatePerInstallment:
          Number(cardInterestRate.replace(",", ".")) || 0,
      });

      setSettings(updated);
      setAsaasApiKey("");
      setSaved(true);
    } catch (err) {
      setActionError(extractMessage(err, "Não foi possível salvar."));
    } finally {
      setSaving(false);
    }
  }

  async function testConnection() {
    setTesting(true);
    setTestResult(null);

    try {
      const result = await paymentMethodSettingsService.testAsaas({
        apiKey: asaasApiKey || undefined,
        sandbox: asaasSandbox,
      });

      setTestResult(result);
    } catch (err) {
      setTestResult({
        ok: false,
        message: extractMessage(err, "Não foi possível testar a conexão."),
      });
    } finally {
      setTesting(false);
    }
  }

  async function regenerateToken() {
    try {
      const result = await paymentMethodSettingsService.regenerateWebhookToken();

      setSettings((prev) =>
        prev ? { ...prev, asaasWebhookToken: result.asaasWebhookToken } : prev
      );
    } catch (err) {
      setActionError(
        extractMessage(err, "Não foi possível gerar um novo token.")
      );
    }
  }

  const webhookUrl = settings
    ? `${env.apiUrl}/entry-charges/webhook/asaas/${settings.companyId}`
    : "";

  return (
    <AppShell workspaceLabel="Formas de pagamento">
      <div className="space-y-6">
        <div>
          <Link
            href="/erp/financeiro/receber"
            className="mb-3 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          >
            <ArrowLeft size={16} />
            Financeiro
          </Link>

          <div className="flex items-center gap-2">
            <CreditCard
              size={22}
              className="text-[var(--text-secondary)]"
            />

            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              Formas de pagamento
            </h1>
          </div>

          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Configure o gateway de cobrança (Asaas) e o acréscimo por
            forma de pagamento — aplicado ao gerar o boleto/PIX/cartão
            enviado ao cliente.
          </p>
        </div>

        {loading ? (
          <div className="space-y-3">
            <div className="h-40 animate-pulse rounded-2xl bg-[var(--surface-hover)]" />
            <div className="h-40 animate-pulse rounded-2xl bg-[var(--surface-hover)]" />
          </div>
        ) : loadError || !settings ? (
          <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
            {loadError}
          </div>
        ) : (
          <>
            <section className={sectionClass}>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Gateway Asaas
              </h2>

              <p className="text-sm text-[var(--text-muted)]">
                Cada empresa usa a própria conta Asaas — o dinheiro cai
                direto na sua conta, não na da AlePejo. Não tem conta
                ainda? Crie uma gratuita em asaas.com.
              </p>

              <ToggleRow
                title="Usar o Asaas nas cobranças"
                description={
                  asaasEnabled
                    ? "Ligado — boleto, PIX e cartão geram cobrança de verdade no Asaas."
                    : "Desligado — mesmo com a chave configurada, boleto/PIX/cartão viram só um aviso informativo, sem cobrança real."
                }
                checked={asaasEnabled}
                onChange={(value) => {
                  setAsaasEnabled(value);
                  setSaved(false);
                }}
              />

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className={labelClass}>API Key do Asaas</label>

                  <input
                    type="password"
                    className={fieldClass}
                    placeholder={
                      settings.hasAsaasApiKey
                        ? "Chave já configurada — digite pra trocar"
                        : "Cole aqui a API Key"
                    }
                    value={asaasApiKey}
                    onChange={(e) => {
                      setAsaasApiKey(e.target.value);
                      setSaved(false);
                    }}
                  />
                </div>

                <div>
                  <label className={labelClass}>Ambiente</label>

                  <select
                    className={fieldClass}
                    value={asaasSandbox ? "sandbox" : "producao"}
                    onChange={(e) => {
                      setAsaasSandbox(e.target.value === "sandbox");
                      setSaved(false);
                    }}
                  >
                    <option value="sandbox">Sandbox (testes)</option>
                    <option value="producao">Produção</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={testing}
                  onClick={() => void testConnection()}
                  className="h-10 shrink-0 rounded-xl border border-[var(--border)] px-4 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] disabled:opacity-60"
                >
                  {testing ? "Testando..." : "Testar conexão"}
                </button>

                {testResult && (
                  <p
                    className={`text-xs ${testResult.ok ? "text-[var(--success)]" : "text-[var(--danger)]"}`}
                  >
                    {testResult.message}
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] p-3">
                <p className="text-xs font-medium text-[var(--text-secondary)]">
                  Webhook (avisa quando o cliente pagar de verdade)
                </p>

                <p className="mt-1 break-all font-mono text-xs text-[var(--text-muted)]">
                  {webhookUrl || "—"}
                </p>

                <p className="mt-1 break-all font-mono text-xs text-[var(--text-muted)]">
                  Token: {settings.asaasWebhookToken}
                </p>

                <button
                  type="button"
                  onClick={() => void regenerateToken()}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--primary)] hover:underline"
                >
                  <RefreshCw size={12} />
                  Gerar novo token
                </button>

                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  Cole essa URL e o token na configuração de webhook da
                  sua conta Asaas (Configurações → Integrações →
                  Webhooks).
                </p>
              </div>
            </section>

            <section className={sectionClass}>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Boleto
              </h2>

              <SurchargeInputs
                label="Acréscimo no boleto"
                helper="Somado ao valor do título quando a forma de pagamento é boleto."
                fields={boleto}
                onChange={(v) => {
                  setBoleto(v);
                  setSaved(false);
                }}
              />
            </section>

            <section className={sectionClass}>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Transferência / Depósito
              </h2>

              <div>
                <label className={labelClass}>
                  Conta bancária mostrada ao cliente
                </label>

                <select
                  className={fieldClass}
                  value={defaultBankAccountId}
                  onChange={(e) => {
                    setDefaultBankAccountId(e.target.value);
                    setSaved(false);
                  }}
                >
                  <option value="">Selecione uma conta</option>

                  {bankAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.description} — {account.bankName}
                    </option>
                  ))}
                </select>

                {bankAccounts.length === 0 && (
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Cadastre uma conta em Contas Bancárias primeiro.
                  </p>
                )}
              </div>

              <SurchargeInputs
                label="Acréscimo na transferência/depósito"
                helper="Somado ao valor do título quando a forma de pagamento é transferência ou depósito."
                fields={transfer}
                onChange={(v) => {
                  setTransfer(v);
                  setSaved(false);
                }}
              />
            </section>

            <section className={sectionClass}>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                PIX
              </h2>

              <SurchargeInputs
                label="Acréscimo no PIX"
                helper="Somado ao valor do título quando a forma de pagamento é PIX."
                fields={pix}
                onChange={(v) => {
                  setPix(v);
                  setSaved(false);
                }}
              />
            </section>

            <section className={sectionClass}>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Cartão (débito/crédito)
              </h2>

              <SurchargeInputs
                label="Acréscimo no cartão"
                helper="Somado ao valor do título quando a forma de pagamento é cartão."
                fields={card}
                onChange={(v) => {
                  setCard(v);
                  setSaved(false);
                }}
              />

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className={labelClass}>Máximo de parcelas</label>

                  <input
                    inputMode="numeric"
                    className={fieldClass}
                    value={cardMaxInstallments}
                    onChange={(e) => {
                      setCardMaxInstallments(e.target.value);
                      setSaved(false);
                    }}
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Parcelas sem juros (até quantas)
                  </label>

                  <input
                    inputMode="numeric"
                    className={fieldClass}
                    value={cardInterestFreeInstallments}
                    onChange={(e) => {
                      setCardInterestFreeInstallments(e.target.value);
                      setSaved(false);
                    }}
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Informativo: juros por parcela extra (%)
                  </label>

                  <input
                    inputMode="decimal"
                    className={fieldClass}
                    value={cardInterestRate}
                    onChange={(e) => {
                      setCardInterestRate(e.target.value);
                      setSaved(false);
                    }}
                  />
                </div>
              </div>

              <p className="text-xs text-[var(--text-muted)]">
                O parcelamento em si é escolhido pelo cliente na página
                de pagamento do Asaas — esses campos só definem o teto
                informado a ele na mensagem.
              </p>
            </section>

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
                <p className="text-xs text-[var(--success)]">Salvo.</p>
              )}
            </div>

            {actionError && (
              <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                {actionError}
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
