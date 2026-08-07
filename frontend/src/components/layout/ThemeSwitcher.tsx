"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

/**
 * Alterna entre tema claro e escuro.
 *
 * O next-themes só conhece o tema no cliente; renderizar o ícone antes
 * da montagem causaria divergência entre servidor e cliente (hydration
 * mismatch). Por isso o placeholder do mesmo tamanho até montar.
 */
export function ThemeSwitcher() {
  const [mounted, setMounted] = useState(false);

  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === "dark";

  if (!mounted) {
    return (
      <span
        aria-hidden="true"
        className="size-9 rounded-xl border border-[var(--border)]"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={
        isDark
          ? "Mudar para tema claro"
          : "Mudar para tema escuro"
      }
      title={
        isDark
          ? "Mudar para tema claro"
          : "Mudar para tema escuro"
      }
      className="
        flex
        size-9
        items-center
        justify-center
        rounded-xl
        border
        border-[var(--border)]
        bg-[var(--surface)]
        text-[var(--text-secondary)]
        transition-colors
        hover:border-[var(--border-strong)]
        hover:bg-[var(--surface-hover)]
        hover:text-[var(--text-primary)]
      "
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
