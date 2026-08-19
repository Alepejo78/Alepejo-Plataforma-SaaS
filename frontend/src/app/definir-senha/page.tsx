"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { api } from "@/services/api";
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

function DefinirSenhaForm() {
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId") ?? "";
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [companySlug, setCompanySlug] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  const linkInvalid = !userId || !token;

  useEffect(() => {
    if (linkInvalid) {
      return;
    }

    api
      .get<{ data: { email: string } }>("/auth/reset-info", {
        params: { userId, token },
      })
      .then(({ data }) => setEmail(data.data.email))
      .catch(() => {
        // Token inválido/expirado: o erro real aparece só ao tentar
        // salvar a senha — aqui só deixa de mostrar o e-mail.
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, token]);

  async function handleSubmit() {
    if (loading) {
      return;
    }

    setError("");

    if (password.length < 8) {
      setError("A senha deve possuir no mínimo 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas não conferem.");
      return;
    }

    setLoading(true);

    try {
      const { data } = await api.post<{
        data: { success: boolean; companySlug: string | null };
      }>("/auth/set-password", {
        userId,
        token,
        password,
      });

      setCompanySlug(data.data.companySlug);
      setDone(true);
    } catch (err) {
      setError(
        extractMessage(
          err,
          "Não foi possível definir a senha. Peça um novo link."
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

        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Definir senha de acesso
        </h1>

        <p className="mb-6 mt-1 min-h-[1.25rem] text-sm text-[var(--text-muted)]">
          {email && (
            <>
              Conta: <strong>{email}</strong>
            </>
          )}
        </p>

        {linkInvalid ? (
          <p className="text-sm text-[var(--danger)]">
            Link inválido. Peça um novo link de acesso.
          </p>
        ) : done ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[var(--success)]">
              <CheckCircle2 size={20} />
              <p className="text-sm font-medium">
                Senha definida com sucesso.
              </p>
            </div>

            <Link
              href={companySlug ? `/${companySlug}/login` : "/login"}
              className="inline-block rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)]"
            >
              Ir para o login
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label
                className="mb-1 block text-sm font-medium text-[var(--text-secondary)]"
                htmlFor="password"
              >
                Nova senha
              </label>

              <input
                id="password"
                type="password"
                className={fieldClass}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div>
              <label
                className="mb-1 block text-sm font-medium text-[var(--text-secondary)]"
                htmlFor="confirmPassword"
              >
                Confirmar senha
              </label>

              <input
                id="confirmPassword"
                type="password"
                className={fieldClass}
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(e.target.value)
                }
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
              {loading ? "Salvando..." : "Definir senha"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DefinirSenhaPage() {
  return (
    <Suspense fallback={null}>
      <DefinirSenhaForm />
    </Suspense>
  );
}
