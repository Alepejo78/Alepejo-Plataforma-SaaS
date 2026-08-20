import Link from "next/link";

import { systemConfig } from "@/config/system";

/**
 * Cabeçalho compartilhado das páginas públicas (institucional, planos)
 * — mesma logo, nome e tagline nas duas, pra não parecer um site
 * diferente ao navegar entre elas.
 */
export function PublicNav({
  hidePlanosLink = false,
}: {
  /** Esconde o botão "Ver planos" — usado na própria página de planos. */
  hidePlanosLink?: boolean;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-2">
        <Link href="/institucional" className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={systemConfig.company.logo}
            alt={systemConfig.company.name}
            width={72}
            height={72}
            className="h-14 w-14 object-contain sm:h-[72px] sm:w-[72px]"
          />

          <div className="leading-tight">
            <p className="text-sm font-bold text-[var(--text-primary)]">
              {systemConfig.company.name} {systemConfig.systemName}
            </p>
            <p className="text-[11px] text-[var(--text-muted)]">
              Gestão inteligente para pequenas empresas
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-[var(--text-secondary)] md:flex">
          <Link
            href="/institucional#funcionalidades"
            className="hover:text-[var(--text-primary)]"
          >
            Funcionalidades
          </Link>
          <Link
            href="/institucional#demonstracao"
            className="hover:text-[var(--text-primary)]"
          >
            Demonstração
          </Link>
          <Link
            href="/institucional#implantacao"
            className="hover:text-[var(--text-primary)]"
          >
            Implantação
          </Link>
          <Link
            href="/institucional#contato"
            className="hover:text-[var(--text-primary)]"
          >
            Contato
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            Entrar
          </Link>

          {!hidePlanosLink && (
            <Link
              href="/planos"
              className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)]"
            >
              Ver planos
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
