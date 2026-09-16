import Link from "next/link";

import { systemConfig } from "@/config/system";

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
}: {
  links: NavLink[];
  ctaLabel?: string;
  ctaHref?: string;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-2">
        <Link href="/inicio" className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={systemConfig.company.logo}
            alt={systemConfig.company.name}
            width={101}
            height={64}
            className="h-12 w-auto object-contain sm:h-16"
          />

          <div className="leading-tight">
            <p className="text-sm font-bold text-[var(--text-primary)]">
              {systemConfig.company.name} Assessoria
            </p>
            <p className="text-[11px] text-[var(--text-muted)]">
              Prestação de Serviços
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-[var(--text-secondary)] md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hover:text-[var(--text-primary)]"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {ctaLabel && ctaHref && (
          <Link
            href={ctaHref}
            className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)]"
          >
            {ctaLabel}
          </Link>
        )}
      </div>
    </header>
  );
}
