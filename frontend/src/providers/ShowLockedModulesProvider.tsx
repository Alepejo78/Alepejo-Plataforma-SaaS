"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

const STORAGE_KEY = "erp-show-locked-modules";

interface ShowLockedModulesContextValue {
  showLocked: boolean;
  setShowLocked: (value: boolean) => void;
}

const ShowLockedModulesContext =
  createContext<ShowLockedModulesContextValue | null>(null);

/**
 * Preferência de mostrar/esconder módulos sem licença — compartilhada
 * entre a barra lateral do ERP e a matriz de permissões dos perfis de
 * acesso (Configurações → Perfis de acesso). Guardada no navegador
 * (por dispositivo, não por usuário/empresa no banco); vem "mostrar"
 * por padrão, igual já era o comportamento antes desta opção existir.
 *
 * Contexto (não só um hook lendo localStorage) de propósito: cada
 * montagem própria do hook lia o navegador só na hora de montar —
 * alternar na barra lateral não refletia na tela de permissões (nem
 * vice-versa) sem recarregar a página inteira.
 */
export function ShowLockedModulesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
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

  return (
    <ShowLockedModulesContext.Provider
      value={{ showLocked, setShowLocked }}
    >
      {children}
    </ShowLockedModulesContext.Provider>
  );
}

export function useShowLockedModules() {
  const ctx = useContext(ShowLockedModulesContext);

  if (!ctx) {
    throw new Error(
      "useShowLockedModules precisa estar dentro de ShowLockedModulesProvider."
    );
  }

  return [ctx.showLocked, ctx.setShowLocked] as const;
}
