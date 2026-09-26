"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, Locale, isLocale } from "./config";

interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const LanguageContext = createContext<LanguageContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
});

/**
 * Idioma escolhido pelo visitante das páginas de vitrine — guardado só no
 * navegador (localStorage), sem rota `/en`/`/pt` nem passar pelo
 * middleware: esse middleware já faz reescrita de domínio e de empresa
 * logada, e mexer nele por causa de idioma arriscava quebrar login (ver
 * comentários em `middleware.ts`). Sem cookie, o servidor sempre renderiza
 * em pt-BR e o texto troca no cliente assim que a página carrega.
 */
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
      if (isLocale(stored)) {
        setLocaleState(stored);
      }
    } catch {
      // localStorage indisponível (modo privado etc.) — mantém o padrão.
    }
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      // idem — troca só dura a visita atual.
    }
  }, []);

  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}
