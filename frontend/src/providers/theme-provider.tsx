"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * attribute="class" faz o next-themes aplicar a classe .dark no <html>,
 * que é exatamente o seletor usado em globals.css.
 *
 * enableSystem permite a opção "seguir o sistema"; defaultTheme="system"
 * respeita a preferência do SO no primeiro acesso, e a escolha manual
 * do usuário passa a ter prioridade a partir daí.
 */
export function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
