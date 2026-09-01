"use client";

import { useMemo } from "react";

import { useAuth } from "@/providers/AuthProvider";
import { useShowLockedModules } from "@/providers/ShowLockedModulesProvider";

import { menu } from "@/components/layout/Sidebar/menu";
import {
  isMenuGroup,
  type MenuEntry,
} from "@/components/layout/Sidebar/Sidebar.types";

/**
 * Devolve as entradas de menu que o usuário atual pode ver.
 *
 * Permissão (RBAC) ainda esconde de verdade — sem a permissão, o item
 * nem aparece (não é algo que "comprar" resolve). Licença de módulo,
 * não: o item aparece bloqueado, com chamada pra adquirir, em vez de
 * simplesmente sumir — decisão do usuário, pra deixar visível o que o
 * sistema oferece mesmo sem estar contratado.
 *
 * Grupos são filtrados pela permissão dos filhos; um grupo sem nenhum
 * filho com permissão é removido do menu (não existe "grupo bloqueado"
 * por inteiro — cada filho carrega seu próprio `locked`, então um
 * grupo pode ter parte licenciada e parte bloqueada ao mesmo tempo,
 * ex.: Recursos Humanos com módulo HR liberado e LABOR não).
 *
 * Isto é conveniência de UI, não segurança: esconder ou bloquear o
 * item não protege nada. A autorização real acontece no backend, que
 * valida licença e permissão a cada request.
 */
export function useMenu(): MenuEntry[] {
  const { user, can, hasModule } = useAuth();
  const [showLocked] = useShowLockedModules();

  return useMemo(() => {
    if (!user) {
      return [];
    }

    const hasPermission = (entry: { permission?: string | string[] }) =>
      !entry.permission ||
      (Array.isArray(entry.permission)
        ? entry.permission.some((p) => can(p))
        : can(entry.permission));

    const isLocked = (entry: { module?: string }) =>
      Boolean(entry.module && !hasModule(entry.module));

    return menu.reduce<MenuEntry[]>((visible, entry) => {
      if (!isMenuGroup(entry)) {
        if (!hasPermission(entry)) {
          return visible;
        }

        const locked = isLocked(entry);

        if (locked && !showLocked) {
          return visible;
        }

        visible.push({ ...entry, locked });

        return visible;
      }

      if (!hasPermission(entry)) {
        return visible;
      }

      const children = entry.children
        .filter(hasPermission)
        .map((child) => ({ ...child, locked: isLocked(child) }))
        .filter((child) => showLocked || !child.locked);

      if (children.length > 0) {
        visible.push({ ...entry, children });
      }

      return visible;
    }, []);
  }, [user, can, hasModule, showLocked]);
}
