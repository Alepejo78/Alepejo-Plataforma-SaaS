export type Locale = "pt-BR" | "en-US";

export const DEFAULT_LOCALE: Locale = "pt-BR";

export const LOCALE_STORAGE_KEY = "alepejo_locale";

export const LOCALES: { code: Locale; label: string; flag: string }[] = [
  { code: "pt-BR", label: "Português (Brasil)", flag: "🇧🇷" },
  { code: "en-US", label: "English (US)", flag: "🇺🇸" },
];

export function isLocale(value: string | null | undefined): value is Locale {
  return LOCALES.some((l) => l.code === value);
}
