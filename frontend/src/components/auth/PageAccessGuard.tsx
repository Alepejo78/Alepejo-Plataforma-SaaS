"use client";

import type { ReactNode } from "react";
import { ShieldAlert } from "lucide-react";

import { useAuth } from "@/providers/AuthProvider";

/**
 * Bloqueia a página inteira (não só um botão) quando falta a
 * permissão — pra telas que não têm nenhum `<Can>` interno hoje e por
 * isso ficam abertas pra qualquer usuário logado que digitar a URL
 * (o backend já barra a ação/dado, isso aqui só evita expor a tela
 * quebrada/vazia nesse caso).
 */
export function PageAccessGuard({
  permission,
  children,
}: {
  /** Uma permissão, ou uma lista — lista libera com QUALQUER uma delas (ex.: página que mistura seções de módulos diferentes). */
  permission: string | string[];
  children: ReactNode;
}) {
  const { can, loading } = useAuth();

  if (loading) {
    return null;
  }

  const allowed = Array.isArray(permission)
    ? permission.some((p) => can(p))
    : can(permission);

  if (!allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-8">
        <div className="flex max-w-md flex-col items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
          <ShieldAlert
            size={32}
            className="text-[var(--text-muted)]"
          />

          <p className="font-semibold text-[var(--text-primary)]">
            Sem permissão
          </p>

          <p className="text-sm text-[var(--text-muted)]">
            Você não tem permissão para acessar esta página.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
