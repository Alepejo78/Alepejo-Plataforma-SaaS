"use client";

import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";

import { useTabs } from "@/providers/TabsProvider";

interface OsCardLinkProps {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  /**
   * Animação específica do ícone no hover/clique (CSS em globals.css,
   * seletores `svg[data-icon-anim="..."]`). Ausente = só a animação
   * genérica (escala).
   */
  iconAnim?: string;
  /** Sem conteúdo ainda (ex.: Portal) — continua clicável, só avisa. */
  comingSoon?: boolean;
}

/** Card de atalho usado nas telas "hub" do app OS (mesmo estilo dos atalhos da Visão geral). */
export function OsCardLink({
  title,
  description,
  href,
  icon: Icon,
  iconAnim,
  comingSoon,
}: OsCardLinkProps) {
  const { openTab } = useTabs("os");

  function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    // Ctrl/Cmd/clique-do-meio: deixa o navegador abrir numa aba nova de
    // verdade, sem mexer nas guias desta aba.
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    ) {
      return;
    }

    event.preventDefault();
    openTab({ href, title });
  }

  return (
    <Link
      href={href}
      onClick={handleClick}
      className="group flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition-colors hover:border-[var(--primary)]"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] text-[var(--text-secondary)] transition-colors group-hover:border-[var(--primary)] group-hover:text-[var(--primary)]">
          <Icon size={20} data-icon-anim={iconAnim} />
        </span>

        <div className="min-w-0">
          <p className="font-medium text-[var(--text-primary)]">
            {title}
          </p>

          <p className="text-sm text-[var(--text-muted)]">
            {description}
          </p>
        </div>
      </div>

      {comingSoon ? (
        <span className="shrink-0 rounded bg-[var(--surface-hover)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--text-muted)]">
          Em breve
        </span>
      ) : (
        <ArrowRight
          size={18}
          className="shrink-0 text-[var(--text-muted)] transition-transform group-hover:translate-x-1"
        />
      )}
    </Link>
  );
}
