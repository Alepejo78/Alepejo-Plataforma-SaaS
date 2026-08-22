"use client";

import { useAuth } from "@/providers/AuthProvider";
import { brandPaletteCss } from "@/lib/brandColor";

/**
 * Aplica a cor de destaque da empresa por cima das variáveis do
 * `globals.css`.
 *
 * Vai numa tag `<style>` em vez de mexer no `style` de cada elemento
 * porque o sistema inteiro já lê `--primary` — trocando a variável,
 * botão, link, aba ativa e realce mudam de uma vez, sem tocar em
 * nenhuma tela.
 *
 * Só vale com o módulo BRANDING licenciado e a chave ligada; sem isso
 * o sistema fica no azul padrão AlePejo.
 */
export function BrandColorStyle() {
  const { user, hasModule } = useAuth();

  const company = user?.company;

  const ativo =
    hasModule("BRANDING") &&
    Boolean(company?.brandingColorEnabled) &&
    Boolean(company?.brandColor);

  if (!ativo || !company?.brandColor) {
    return null;
  }

  const css = brandPaletteCss(company.brandColor);

  if (!css) {
    return null;
  }

  return <style>{css}</style>;
}
