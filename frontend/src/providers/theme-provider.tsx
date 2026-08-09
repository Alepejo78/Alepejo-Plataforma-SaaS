"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

import { useAuth } from "./AuthProvider";

/**
 * attribute="class" faz o next-themes aplicar a classe .dark no <html>,
 * que é exatamente o seletor usado em globals.css.
 *
 * enableSystem permite a opção "seguir o sistema"; defaultTheme="system"
 * respeita a preferência do SO no primeiro acesso, e a escolha manual
 * do usuário passa a ter prioridade a partir daí.
 *
 * `forcedTheme="light"` trava o tema quando a empresa não tem o módulo
 * BRANDING licenciado — é esse módulo que libera o alternador de tema
 * (ver ThemeSwitcher/TopBar). Sem ele, ou enquanto a sessão ainda está
 * carregando, o sistema abre sempre no claro, mesmo que exista uma
 * preferência "escuro" salva de uma licença anterior.
 *
 * Precisa estar DENTRO do AuthProvider para conhecer `hasModule`.
 */
export function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, hasModule } = useAuth();

  const canToggleTheme =
    hasModule("BRANDING") &&
    Boolean(user?.company.brandingThemeToggleEnabled);

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      forcedTheme={canToggleTheme ? undefined : "light"}
    >
      {children}
    </NextThemesProvider>
  );
}
