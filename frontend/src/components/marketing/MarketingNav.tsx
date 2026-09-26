import Link from "next/link";

import { systemConfig } from "@/config/system";
import { LanguageSwitcher } from "./LanguageSwitcher";

interface NavLink {
  label: string;
  href: string;
}

/**
 * Cabeçalho compartilhado das páginas da AlePejo Assessoria (`/inicio`,
 * `/servicos`, `/servicos/planos`) — diferente do `PublicNav` do ERP
 * porque aqui a marca é a Assessoria (dois produtos), não só o ERP.
 */
export function MarketingNav({
  links,
  ctaLabel,
  ctaHref,
  secondaryCtaLabel,
  secondaryCtaHref,
  ctaClassName,
  secondaryCtaClassName,
}: {
  links: NavLink[];
  ctaLabel?: string;
  ctaHref?: string;
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;
  /** Substituem o estilo padrão dos botões (ex.: as cores de cada produto em /inicio). */
  ctaClassName?: string;
  secondaryCtaClassName?: string;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--mkt-border)] bg-[var(--mkt-bg-alt)]/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/inicio" className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={systemConfig.company.logo}
            alt={systemConfig.company.name}
            width={101}
            height={64}
            className="h-11 w-auto object-contain sm:h-14"
          />

          <div className="leading-tight">
            <p className="font-display text-sm font-bold text-[var(--mkt-ink)]">
              {systemConfig.company.name} Assessoria
            </p>
            <p className="text-[11px] text-[var(--mkt-muted)]">
              Prestação de Serviços
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-medium text-[var(--mkt-muted)] md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-[var(--mkt-ink)]"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          <LanguageSwitcher />

          {secondaryCtaLabel && secondaryCtaHref && (
            <Link
              href={secondaryCtaHref}
              className={
                secondaryCtaClassName ??
                "hidden rounded-full border border-[var(--mkt-border)] px-4 py-2.5 text-sm font-semibold text-[var(--mkt-ink)] transition-colors hover:border-[var(--mkt-accent)] hover:text-[var(--mkt-accent)] sm:inline-flex"
              }
            >
              {secondaryCtaLabel}
            </Link>
          )}

          {ctaLabel && ctaHref && (
            <Link
              href={ctaHref}
              className={
                ctaClassName ??
                "rounded-full bg-[var(--mkt-ink)] px-5 py-2.5 text-sm font-semibold text-[var(--mkt-bg)] transition-transform hover:scale-[1.04]"
              }
            >
              {ctaLabel}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
