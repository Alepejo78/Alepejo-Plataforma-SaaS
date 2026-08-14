"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MessageCircle,
  QrCode,
  Send,
  Smartphone,
  Unplug,
} from "lucide-react";

import {
  whatsappService,
  type WhatsAppConnectionState,
} from "@/services/whatsapp.service";

function extractMessage(err: unknown, fallback: string) {
  const message = (
    err as { response?: { data?: { message?: unknown } } }
  )?.response?.data?.message;

  if (Array.isArray(message)) {
    return message.join(" ");
  }

  return typeof message === "string" ? message : fallback;
}

const STATUS_LABEL: Record<
  WhatsAppConnectionState["status"],
  string
> = {
  DISCONNECTED: "Desconectado",
  CONNECTING: "Conectando...",
  QR_PENDING: "Aguardando leitura do QR code",
  CONNECTED: "Conectado",
};

const fieldClass = `
  h-11 w-full rounded-xl border border-[var(--border)]
  bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)]
  outline-none transition-colors focus:border-[var(--primary)]
`;

function TestSendSection() {
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{
    sent: boolean;
    error?: string;
  } | null>(null);

  async function handleSend() {
    setSending(true);
    setResult(null);

    try {
      const outcome = await whatsappService.sendTest(phone);

      setResult(outcome);
    } catch (err) {
      setResult({
        sent: false,
        error: extractMessage(
          err,
          "Não foi possível enviar o teste."
        ),
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-xl border border-[var(--border)] p-4">
      <p className="text-sm font-medium text-[var(--text-primary)]">
        Enviar mensagem de teste
      </p>

      <p className="mt-0.5 text-xs text-[var(--text-muted)]">
        Use para confirmar que o envio está funcionando antes de
        depender dele numa cotação real. Se acabou de parear o
        número, pode levar alguns minutos até as mensagens começarem
        a chegar de verdade — teste de novo depois de um tempo antes
        de assumir que travou.
      </p>

      <div className="mt-3 flex flex-wrap gap-3">
        <input
          className={`${fieldClass} max-w-xs`}
          placeholder="DDD + número, ex.: 43991544557"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <button
          type="button"
          disabled={sending || phone.trim().length < 8}
          onClick={() => void handleSend()}
          className="flex h-11 items-center gap-2 rounded-xl border border-[var(--border)] px-5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] disabled:opacity-60"
        >
          <Send size={16} />
          {sending ? "Enviando..." : "Enviar teste"}
        </button>
      </div>

      {result && (
        <p
          className={`mt-2 text-xs ${
            result.sent
              ? "text-[var(--success)]"
              : "text-[var(--danger)]"
          }`}
        >
          {result.sent
            ? "Enviado — confira o celular de destino."
            : `Não enviado: ${result.error ?? "motivo desconhecido"}`}
        </p>
      )}
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: WhatsAppConnectionState["status"];
}) {
  const tone =
    status === "CONNECTED"
      ? "border-[var(--success)] bg-[var(--success-soft)] text-[var(--success)]"
      : status === "QR_PENDING" || status === "CONNECTING"
        ? "border-[var(--warning)] bg-[var(--warning-soft)] text-[var(--warning)]"
        : "border-[var(--border)] bg-[var(--surface-hover)] text-[var(--text-secondary)]";

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${tone}`}
    >
      <span className="h-2 w-2 rounded-full bg-current" />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function WhatsappSettingsTab() {
  const [state, setState] = useState<WhatsAppConnectionState | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await whatsappService.getStatus();

      setState(result);
    } catch (err) {
      setError(
        extractMessage(err, "Não foi possível consultar o status.")
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (
      state?.status === "CONNECTING" ||
      state?.status === "QR_PENDING"
    ) {
      pollRef.current = setInterval(() => void load(), 3000);
    } else if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [state?.status, load]);

  async function handleConnect() {
    setConnecting(true);
    setError("");

    try {
      const result = await whatsappService.connect();

      setState(result);
    } catch (err) {
      setError(
        extractMessage(err, "Não foi possível iniciar a conexão.")
      );
    } finally {
      setConnecting(false);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    setError("");

    try {
      const result = await whatsappService.logout();

      setState(result);
    } catch (err) {
      setError(
        extractMessage(err, "Não foi possível desconectar.")
      );
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <MessageCircle
          size={20}
          className="text-[var(--text-secondary)]"
        />

        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Configuração WhatsApp
          </h2>

          <p className="text-xs text-[var(--text-muted)]">
            Pareia um número de WhatsApp normal com o sistema (via QR
            code, igual ao WhatsApp Web) para avisar automaticamente o
            fornecedor vencedor de uma cotação. Sessão própria desta
            empresa — recomendado usar um número de teste/secundário,
            não o principal da empresa.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="h-32 animate-pulse rounded-xl bg-[var(--surface-hover)]" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Smartphone
                size={18}
                className="text-[var(--text-secondary)]"
              />

              <span className="text-sm font-medium text-[var(--text-primary)]">
                Status da conexão
              </span>
            </div>

            {state && <StatusBadge status={state.status} />}

            <div className="flex flex-wrap gap-3 pt-2">
              {state?.status !== "CONNECTED" && (
                <button
                  type="button"
                  disabled={
                    connecting ||
                    state?.status === "CONNECTING" ||
                    state?.status === "QR_PENDING"
                  }
                  onClick={() => void handleConnect()}
                  className="h-11 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-60"
                >
                  {connecting ? "Conectando..." : "Conectar"}
                </button>
              )}

              {(state?.status === "CONNECTED" ||
                state?.status === "QR_PENDING" ||
                state?.status === "CONNECTING") && (
                <button
                  type="button"
                  disabled={loggingOut}
                  onClick={() => void handleLogout()}
                  className="flex h-11 items-center gap-2 rounded-xl border border-[var(--border)] px-5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--danger)] hover:text-[var(--danger)] disabled:opacity-60"
                >
                  <Unplug size={16} />
                  {loggingOut ? "Desconectando..." : "Desconectar"}
                </button>
              )}
            </div>

            {error && (
              <p className="text-xs text-[var(--danger)]">
                {error}
              </p>
            )}
          </div>

          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] p-6">
            {state?.status === "QR_PENDING" && state.qr ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={state.qr}
                  alt="QR code do WhatsApp"
                  className="h-56 w-56"
                />

                <p className="mt-3 text-center text-xs text-[var(--text-muted)]">
                  No celular: WhatsApp → Configurações → Aparelhos
                  conectados → Conectar um aparelho.
                </p>
              </>
            ) : state?.status === "CONNECTED" ? (
              <div className="flex flex-col items-center gap-2 text-[var(--success)]">
                <MessageCircle size={40} />
                <p className="text-sm font-medium">
                  Número pareado e ativo.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-[var(--text-muted)]">
                <QrCode size={40} />
                <p className="text-center text-sm">
                  Clique em &quot;Conectar&quot; para gerar o QR code
                  de pareamento.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {state?.status === "CONNECTED" && (
        <div className="mt-6">
          <TestSendSection />
        </div>
      )}
    </div>
  );
}
