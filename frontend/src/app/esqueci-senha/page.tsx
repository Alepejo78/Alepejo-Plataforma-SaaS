"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

import { authService } from "@/services/auth.service";
import { AuthBrandHeader } from "@/components/auth/AuthBrandHeader";

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
  outline-none transition-colors
  focus:border-[var(--primary)]
`;

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit() {
    if (loading) {
      return;
    }

    setError("");

    if (!email.trim()) {
      setError("Informe o e-mail da sua conta.");
      return;
    }

    setLoading(true);

    try {
      await authService.forgotPassword(email.trim());

      setDone(true);
    } catch (err) {
      setError(
        extractMessage(
          err,
          "Não foi possível enviar o e-mail. Tente novamente."
        )
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-8">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm">
        <AuthBrandHeader />

        <h1 className="mb-2 text-2xl font-bold text-[var(--text-primary)]">
          Esqueci minha senha
        </h1>

        {done ? (
          <div className="mt-6 space-y-4">
            <div className="flex items-start gap-2 text-[var(--success)]">
              <CheckCircle2 size={20} className="mt-0.5 shrink-0" />

              <p className="text-sm font-medium">
                Se existir uma conta com esse e-mail, o link para criar
                uma nova senha acabou de ser enviado.
              </p>
            </div>

            <p className="text-sm text-[var(--text-muted)]">
              O link vale por 24 horas. Não esqueça de conferir a caixa
              de spam.
            </p>

            <Link
              href="/login"
              className="inline-block rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)]"
            >
              Voltar para o login
            </Link>
          </div>
        ) : (
          <>
            <p className="mb-6 text-sm text-[var(--text-muted)]">
              Informe o e-mail da sua conta e enviaremos um link para
              você criar uma nova senha.
            </p>

            <div className="space-y-4">
              <div>
                <label
                  className="mb-1 block text-sm font-medium text-[var(--text-secondary)]"
                  htmlFor="email"
                >
                  E-mail
                </label>

                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  className={fieldClass}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      void handleSubmit();
                    }
                  }}
                />
              </div>

              {error && (
                <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                  {error}
                </div>
              )}

              <button
                type="button"
                disabled={loading}
                onClick={() => void handleSubmit()}
                className="w-full rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-60"
              >
                {loading ? "Enviando..." : "Enviar link"}
              </button>

              <Link
                href="/login"
                className="flex items-center justify-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              >
                <ArrowLeft size={16} />
                Voltar para o login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
