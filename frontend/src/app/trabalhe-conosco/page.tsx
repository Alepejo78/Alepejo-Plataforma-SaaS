import { Briefcase } from "lucide-react";

import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { WorkWithUs } from "@/components/marketing/WorkWithUs";
import { marketingFontVars } from "@/components/marketing/fonts";
import { Reveal } from "@/components/marketing/Reveal";
import "@/components/marketing/aurora.css";
import "@/components/marketing/marketing-shared.css";

const NAV_LINKS = [
  { label: "Sobre", href: "/inicio#sobre" },
  { label: "Nossos sistemas", href: "/inicio#sistemas" },
  { label: "Contato", href: "/inicio#contato" },
];

/**
 * Rota própria pra "Trabalhe conosco" — antes era uma seção dentro de
 * `/inicio`; o usuário pediu pra tirar da página principal. Fica
 * reachable pelo link no rodapé (ver MarketingFooter). Componente
 * `WorkWithUs` não mudou, só o lugar onde ele é renderizado.
 */
export default function TrabalheConoscoPage() {
  return (
    <div className={`${marketingFontVars} marketing-page theme-aurora`}>
      <MarketingNav links={NAV_LINKS} />

      <section className="relative overflow-hidden border-b border-[var(--mkt-border)]">
        <div aria-hidden className="mkt-dotgrid pointer-events-none absolute inset-0 opacity-30" />
        <div
          aria-hidden
          className="aurora-bg pointer-events-none absolute inset-x-0 top-0 h-[360px] opacity-[0.12]"
        />

        <Reveal className="relative mx-auto max-w-2xl px-6 py-20 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--mkt-border)] bg-[var(--mkt-surface)] px-3 py-1 text-xs font-medium text-[var(--mkt-muted)]">
            <Briefcase size={12} className="text-[var(--mkt-accent)]" />
            Banco de talentos
          </span>

          <h1 className="font-display mt-5 text-3xl font-bold text-[var(--mkt-ink)] sm:text-4xl">
            Quer construir sistemas e assessoria com a gente?
          </h1>

          <p className="mx-auto mt-4 max-w-md text-[var(--mkt-muted)]">
            Deixe seu e-mail e currículo abaixo — guardamos no banco de
            talentos e chamamos quando surgir uma vaga com o seu perfil.
          </p>
        </Reveal>
      </section>

      <WorkWithUs />

      <MarketingFooter page="trabalhe-conosco" />
    </div>
  );
}
