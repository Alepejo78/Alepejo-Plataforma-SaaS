"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { AuthBrandHeader } from "@/components/auth/AuthBrandHeader";
import { getRememberedCompanySlug } from "@/lib/companyLogin";

/**
 * `/login` sozinho não tem mais formulário — o acesso é sempre pelo
 * link com a empresa (`/<empresa>/login`, enviado no e-mail de definir
 * senha). Esta tela só decide:
 * - Este navegador já logou nessa empresa antes (cookie de
 *   `rememberCompanySlug`)? Manda direto pra lá, sem pedir nada de novo
 *   — cobre sessão expirando no meio da navegação.
 * - Não lembra nenhuma empresa? Mostra a mensagem pedindo pra usar o
 *   link do e-mail, com atalho pra reenviar.
 */
function LoginGate() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const slug = getRememberedCompanySlug();

    if (slug) {
      const from = searchParams.get("from");
      const query = from ? `?from=${encodeURIComponent(from)}` : "";

      router.replace(`/${slug}/login${query}`);
      return;
    }

    setChecked(true);
  }, [router, searchParams]);

  if (!checked) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-8">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center shadow-sm">
        <AuthBrandHeader />

        <h1 className="mb-2 text-xl font-bold text-[var(--text-primary)]">
          Acesse pelo seu link de login
        </h1>

        <p className="mb-6 text-sm text-[var(--text-muted)]">
          O acesso ao sistema é feito por um link próprio da sua
          empresa, enviado por e-mail. Salve esse link nos favoritos —
          é ele que você vai usar sempre para entrar.
        </p>

        <Link
          href="/esqueci-senha"
          className="mb-3 block rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)]"
        >
          Reenviar meu link de acesso
        </Link>

        <Link
          href="/institucional"
          className="text-sm text-[var(--text-secondary)] hover:underline"
        >
          Conheça o sistema
        </Link>
      </div>
    </div>
  );
}

export default function Login() {
  return (
    <Suspense fallback={null}>
      <LoginGate />
    </Suspense>
  );
}
