"use client";

import type { ReactNode } from "react";
import { ShieldAlert } from "lucide-react";

import { useAuth } from "@/providers/AuthProvider";

/**
 * Relatórios não têm endpoint próprio no backend — reaproveitam a
 * mesma API já protegida pela tela normal (ex.: relatório de Produtos
 * chama a mesma `/products` que a lista usa). A permissão `.report`
 * controla só esta camada (visão de relatório), consistente com o
 * `Can` (ver `components/auth/Can.tsx`): ajusta interface, não é a
 * proteção de dado — essa continua sendo a permissão `.view` da API.
 */
export function ReportAccessGuard({
  permission,
  children,
}: {
  permission: string;
  children: ReactNode;
}) {
  const { can, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!can(permission)) {
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
            Você não tem permissão para ver este relatório.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
