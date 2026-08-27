"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "erp-show-locked-modules";

/**
 * Preferência de mostrar/esconder módulos sem licença — compartilhada
 * entre a barra lateral do ERP e a matriz de permissões dos perfis de
 * acesso (Configurações → Perfis de acesso). Guardada no navegador
 * (por dispositivo, não por usuário/empresa no banco); vem "mostrar"
 * por padrão, igual já era o comportamento antes desta opção existir.
 */
export function useShowLockedModules() {
  const [showLocked, setShowLockedState] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (stored !== null) {
      setShowLockedState(stored === "true");
    }
  }, []);

  function setShowLocked(value: boolean) {
    setShowLockedState(value);
    localStorage.setItem(STORAGE_KEY, String(value));
  }

  return [showLocked, setShowLocked] as const;
}
