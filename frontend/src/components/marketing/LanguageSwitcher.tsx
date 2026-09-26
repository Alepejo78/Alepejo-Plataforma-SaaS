"use client";

import { useEffect, useRef, useState } from "react";

import { LOCALES } from "@/lib/i18n/config";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export function LanguageSwitcher() {
  const { locale, setLocale } = useLanguage();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Selecionar idioma"
        className="flex items-center gap-1.5 rounded-full border border-current/15 px-3 py-2 text-sm text-current opacity-90 transition-opacity hover:opacity-100"
      >
        <span className="text-base leading-none" aria-hidden>
          {current.flag}
        </span>
        <span className="hidden sm:inline">{current.code}</span>
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 top-[calc(100%+8px)] z-30 min-w-[190px] overflow-hidden rounded-xl border border-black/10 bg-white py-1 text-[#14232e] shadow-lg dark:border-white/10 dark:bg-[#16283a] dark:text-[#eef1f4]"
        >
          {LOCALES.map((option) => (
            <li key={option.code}>
              <button
                type="button"
                role="option"
                aria-selected={option.code === locale}
                onClick={() => {
                  setLocale(option.code);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/10 ${
                  option.code === locale ? "font-semibold" : "opacity-75"
                }`}
              >
                <span className="text-base leading-none" aria-hidden>
                  {option.flag}
                </span>
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
