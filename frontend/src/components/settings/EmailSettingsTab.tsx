"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, EyeOff, Mail, Send } from "lucide-react";

import { companyService } from "@/services/company.service";
import {
  emailSettingsService,
  type EmailSettingsPayload,
} from "@/services/email-settings.service";

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

const emptyForm: EmailSettingsPayload & { password: string } = {
  host: "",
  port: 587,
  user: "",
  password: "",
  fromEmail: "",
  fromName: "",
  enabled: false,
};

export function EmailSettingsTab() {
  const [form, setForm] = useState(emptyForm);
  const [hasPassword, setHasPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const [testTo, setTestTo] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    sent: boolean;
    error?: string;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [settings, company] = await Promise.all([
        emailSettingsService.get(),
        companyService.getMine(),
      ]);

      setForm({
        host: settings.host ?? "",
        port: settings.port ?? 587,
        user: settings.user ?? "",
        password: "",
        // Sem valor salvo ainda, sugere o e-mail já cadastrado da
        // empresa como ponto de partida (pedido do usuário).
        fromEmail:
          settings.fromEmail ?? company.email ?? "",
        fromName:
          settings.fromName ??
          company.tradeName ??
          company.legalName ??
          "",
        enabled: settings.enabled,
      });

      setHasPassword(settings.hasPassword);
    } catch (err) {
      setError(
        extractMessage(
          err,
          "Não foi possível carregar a configuração de e-mail."
        )
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function setField(
    field: keyof typeof emptyForm,
    value: string | number | boolean
  ) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setSaved(false);

    try {
      const payload: EmailSettingsPayload = {
        host: form.host?.trim() || undefined,
        port: form.port || undefined,
        user: form.user?.trim() || undefined,
        fromEmail: form.fromEmail?.trim() || undefined,
        fromName: form.fromName?.trim() || undefined,
        enabled: form.enabled,
      };

      if (form.password.trim()) {
        payload.password = form.password.trim();
      }

      const settings = await emailSettingsService.update(payload);

      setHasPassword(settings.hasPassword);
      setForm((previous) => ({ ...previous, password: "" }));
      setSaved(true);
    } catch (err) {
      setError(
        extractMessage(
          err,
          "Não foi possível salvar a configuração de e-mail."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);

    try {
      const result = await emailSettingsService.sendTest(testTo);

      setTestResult(result);
    } catch (err) {
      setTestResult({
        sent: false,
        error: extractMessage(
          err,
          "Não foi possível enviar o teste."
        ),
      });
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return (
      <div className="h-64 animate-pulse rounded-xl bg-[var(--surface-hover)]" />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Mail size={20} className="text-[var(--text-secondary)]" />

        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Configuração de E-mail
          </h2>

          <p className="text-xs text-[var(--text-muted)]">
            Servidor SMTP usado pra enviar os avisos automáticos do
            sistema (cotação, pedido de venda, redefinição de senha
            etc.) — use o e-mail que preferir, não precisa ser o
            mesmo cadastrado na empresa.
          </p>
        </div>
      </div>

      <label className="flex w-fit items-center gap-2 text-sm font-medium text-[var(--text-secondary)]">
        <input
          type="checkbox"
          checked={form.enabled ?? false}
          onChange={(e) => setField("enabled", e.target.checked)}
        />
        Habilitado
      </label>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <label className={labelClass} htmlFor="smtpHost">
            Servidor SMTP
          </label>

          <input
            id="smtpHost"
            placeholder="smtp.gmail.com"
            className={fieldClass}
            value={form.host ?? ""}
            onChange={(e) => setField("host", e.target.value)}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="smtpPort">
            Porta
          </label>

          <input
            id="smtpPort"
            type="number"
            className={fieldClass}
            value={form.port ?? 587}
            onChange={(e) =>
              setField("port", Number(e.target.value))
            }
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="smtpUser">
            Usuário SMTP
          </label>

          <input
            id="smtpUser"
            className={fieldClass}
            value={form.user ?? ""}
            onChange={(e) => setField("user", e.target.value)}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="smtpPassword">
            Senha
          </label>

          <div className="relative">
            <input
              id="smtpPassword"
              type={showPassword ? "text" : "password"}
              placeholder={
                hasPassword
                  ? "Senha já configurada — deixe em branco pra manter"
                  : ""
              }
              className={`${fieldClass} pr-11`}
              value={form.password}
              onChange={(e) =>
                setField("password", e.target.value)
              }
            />

            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={
                showPassword ? "Ocultar senha" : "Mostrar senha"
              }
              title={
                showPassword ? "Ocultar senha" : "Mostrar senha"
              }
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
            >
              {showPassword ? (
                <EyeOff size={16} />
              ) : (
                <Eye size={16} />
              )}
            </button>
          </div>
        </div>

        <div>
          <label className={labelClass} htmlFor="fromEmail">
            E-mail do remetente
          </label>

          <input
            id="fromEmail"
            type="email"
            className={fieldClass}
            value={form.fromEmail ?? ""}
            onChange={(e) => setField("fromEmail", e.target.value)}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="fromName">
            Nome do remetente
          </label>

          <input
            id="fromName"
            className={fieldClass}
            value={form.fromName ?? ""}
            onChange={(e) => setField("fromName", e.target.value)}
          />
        </div>
      </div>

      <p className="rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] p-3 text-xs text-[var(--text-muted)]">
        Gmail, Outlook/Microsoft 365 e outros provedores grandes
        exigem uma <strong>&quot;senha de app&quot;</strong> no campo
        Senha (não a senha normal de login) quando a conta tem
        verificação em duas etapas ativada — é uma exigência do
        próprio provedor. Gere a sua em:{" "}
        <a
          href="https://myaccount.google.com/apppasswords"
          target="_blank"
          rel="noreferrer"
          className="text-[var(--primary-text)] underline"
        >
          Gmail
        </a>{" "}
        ·{" "}
        <a
          href="https://account.microsoft.com/security"
          target="_blank"
          rel="noreferrer"
          className="text-[var(--primary-text)] underline"
        >
          Outlook / Microsoft 365
        </a>
      </p>

      {saved && (
        <p className="text-xs text-[var(--success)]">
          Configuração salva.
        </p>
      )}

      {error && (
        <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
          {error}
        </div>
      )}

      <button
        type="button"
        disabled={saving}
        onClick={() => void handleSave()}
        className="rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-60"
      >
        {saving ? "Salvando..." : "Salvar"}
      </button>

      <div className="rounded-xl border border-[var(--border)] p-4">
        <p className="text-sm font-medium text-[var(--text-primary)]">
          Enviar e-mail de teste
        </p>

        <p className="mt-0.5 text-xs text-[var(--text-muted)]">
          Use pra confirmar que o envio está funcionando antes de
          depender dele numa cotação real.
        </p>

        <div className="mt-3 flex flex-wrap gap-3">
          <input
            type="email"
            className={`${fieldClass} max-w-xs`}
            placeholder="destino@exemplo.com"
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
          />

          <button
            type="button"
            disabled={testing || !testTo.trim()}
            onClick={() => void handleTest()}
            className="flex h-11 items-center gap-2 rounded-xl border border-[var(--border)] px-5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] disabled:opacity-60"
          >
            <Send size={16} />
            {testing ? "Enviando..." : "Enviar teste"}
          </button>
        </div>

        {testResult && (
          <p
            className={`mt-2 text-xs ${
              testResult.sent
                ? "text-[var(--success)]"
                : "text-[var(--danger)]"
            }`}
          >
            {testResult.sent
              ? "Enviado — confira a caixa de entrada de destino."
              : `Não enviado: ${
                  testResult.error ?? "motivo desconhecido"
                }`}
          </p>
        )}
      </div>
    </div>
  );
}
