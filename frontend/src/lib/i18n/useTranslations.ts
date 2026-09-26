import { DEFAULT_LOCALE } from "./config";
import { useLanguage } from "./LanguageProvider";

type Dictionary = Record<string, unknown>;
export type LocaleDictionaries = Record<string, Dictionary>;

function lookup(dict: Dictionary, path: string[]): unknown {
  let current: unknown = dict;
  for (const key of path) {
    if (typeof current !== "object" || current === null) return undefined;
    current = (current as Dictionary)[key];
  }
  return current;
}

/**
 * `t("secao.chave")` lê no dicionário do idioma atual; se a chave não
 * existir lá (tradução incompleta), cai pro pt-BR em vez de mostrar a
 * chave crua — mais seguro para textos de vitrine do que quebrar a tela.
 */
export function useTranslations(dictionaries: LocaleDictionaries) {
  const { locale } = useLanguage();

  function t(key: string): string {
    const path = key.split(".");
    const value = lookup(dictionaries[locale] ?? {}, path);
    if (typeof value === "string") return value;

    const fallback = lookup(dictionaries[DEFAULT_LOCALE] ?? {}, path);
    if (typeof fallback === "string") return fallback;

    return key;
  }

  function tList(key: string): string[] {
    return tItems<string>(key);
  }

  /** Lê um array de qualquer formato (ex.: perguntas/respostas do FAQ), com o mesmo fallback pro pt-BR. */
  function tItems<T>(key: string): T[] {
    const path = key.split(".");
    const value = lookup(dictionaries[locale] ?? {}, path);
    if (Array.isArray(value)) return value as T[];

    const fallback = lookup(dictionaries[DEFAULT_LOCALE] ?? {}, path);
    if (Array.isArray(fallback)) return fallback as T[];

    return [];
  }

  return { t, tList, tItems, locale };
}
