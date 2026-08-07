"use client";

import { useMemo } from "react";

import { useAuth } from "@/providers/AuthProvider";

import { menu } from "@/components/layout/Sidebar/menu";
import {
  isMenuGroup,
  type MenuEntry,
} from "@/components/layout/Sidebar/Sidebar.types";

/**
 * Devolve apenas as entradas de menu que o usuário atual pode ver.
 *
 * Uma entrada aparece quando:
 *   1. o módulo exigido está licenciado para a empresa, E
 *   2. o usuário possui a permissão exigida.
 *
 * Grupos são filtrados nos filhos; um grupo sem nenhum filho visível
 * é removido do menu.
 *
 * Isto é conveniência de UI, não segurança: esconder o item não
 * protege nada. A autorização real acontece no backend, que valida
 * licença e permissão a cada request.
 */
export function useMenu(): MenuEntry[] {
  const { user, can, hasModule } = useAuth();

  return useMemo(() => {
    if (!user) {
      return [];
    }

    const isVisible = (entry: {
      module?: string;
      permission?: string;
    }) => {
      if (entry.module && !hasModule(entry.module)) {
        return false;
      }

      if (entry.permission && !can(entry.permission)) {
        return false;
      }

      return true;
    };

    return menu.reduce<MenuEntry[]>((visible, entry) => {
      if (!isVisible(entry)) {
        return visible;
      }

      if (!isMenuGroup(entry)) {
        visible.push(entry);

        return visible;
      }

      const children = entry.children.filter(isVisible);

      if (children.length > 0) {
        visible.push({ ...entry, children });
      }

      return visible;
    }, []);
  }, [user, can, hasModule]);
}
