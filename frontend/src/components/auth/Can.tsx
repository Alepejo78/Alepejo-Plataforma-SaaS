"use client";

import type { ReactNode } from "react";

import { useAuth } from "@/providers/AuthProvider";

interface CanProps {
  /** Permissão exigida (ex.: "client.create") */
  permission?: string;

  /** Módulo licenciado exigido (ex.: "SALES") */
  module?: string;

  children: ReactNode;

  /** Conteúdo alternativo quando não autorizado. */
  fallback?: ReactNode;
}

/**
 * Renderiza `children` apenas se o usuário tiver a permissão e/ou o
 * módulo exigidos.
 *
 * Serve para ajustar a interface (esconder botões que resultariam em
 * 403), não para proteger dados: a autorização real é do backend.
 */
export function Can({
  permission,
  module,
  children,
  fallback = null,
}: CanProps) {
  const { can, hasModule } = useAuth();

  if (module && !hasModule(module)) {
    return <>{fallback}</>;
  }

  if (permission && !can(permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
