import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowLeft, Bell, Gift, LinkIcon, Sparkles } from "lucide-react";

import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { ContactSection } from "@/components/marketing/ContactSection";
import { marketingFontVars } from "@/components/marketing/fonts";
import { Reveal } from "@/components/marketing/Reveal";
import "@/components/marketing/vibrant.css";
import "@/components/marketing/marketing-shared.css";

const NAV_LINKS = [
  { label: "Recursos", href: "/servicos#recursos" },
  { label: "Segmentos", href: "/servicos#segmentos" },
  { label: "Contato", href: "/servicos#contato" },
];

const AVAILABLE_NOW = [
  {
    icon: LinkIcon,
    title: "Link de agendamento",
    description: "Sua página pública de horários, já funcionando hoje.",
  },
  {
    icon: Bell,
    title: "Lembretes no WhatsApp",
    description: "Confirmação e lembrete automático antes do atendimento.",
  },
  {
    icon: Gift,
    title: "Fidelidade",
    description: "Pontos por atendimento e resgate configurável.",
  },
];

/**
 * Planos do AlePejo Serviços — vazio de propósito por enquanto. A
 * configuração de planos de verdade (preços, módulos) entra numa rodada
 * futura; até lá, essa tela mostra o que já dá pra usar hoje em vez de
 * ser um beco sem saída.
 */
export default function ServicosPlanosPage() {
  return (
    <div className={`${marketingFontVars} marketing-page theme-vibrant`}>
      <MarketingNav links={NAV_LINKS} />

      <section className="relative overflow-hidden">
        <div aria-hidden className="mkt-dotgrid pointer-events-none absolute inset-0 opacity-30" />
        <div
          aria-hidden
          className="vibrant-bg pointer-events-none absolute inset-x-0 top-0 h-[420px] opacity-[0.14]"
        />

        <Reveal className="relative mx-auto max-w-2xl px-6 py-24 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--mkt-border)] bg-[var(--mkt-surface)] px-3 py-1 text-xs font-medium text-[var(--mkt-muted)]">
            <Sparkles size={12} className="text-[var(--mkt-accent)]" />
            Planos chegando em breve
          </span>

          <h1 className="font-display mt-5 text-3xl font-bold text-[var(--mkt-ink)] sm:text-4xl">
            Estamos fechando o preço certo pro seu tamanho de agenda
          </h1>

          <p className="mx-auto mt-4 max-w-md text-[var(--mkt-muted)]">
            Em breve você escolhe o plano ideal aqui mesmo. Por enquanto, fale
            com a gente que avaliamos junto o que seu negócio precisa.
          </p>

          <div
            className="mkt-ticket mkt-panel mx-auto mt-10 max-w-md p-8"
            style={{ "--mkt-ticket-punch": "var(--mkt-bg)" } as CSSProperties}
          >
            <p className="font-display text-lg font-semibold text-[var(--mkt-ink)]">
              Já dá pra usar hoje
            </p>

            <div className="mkt-ticket-divider mt-4 space-y-4 pt-5 text-left">
              {AVAILABLE_NOW.map((item) => (
                <div key={item.title} className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[linear-gradient(135deg,var(--mkt-accent),var(--mkt-accent-2))] text-white">
                    <item.icon size={16} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[var(--mkt-ink)]">{item.title}</p>
                    <p className="text-xs text-[var(--mkt-muted)]">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Link
            href="/servicos"
            className="mt-10 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--mkt-muted)] hover:text-[var(--mkt-ink)]"
          >
            <ArrowLeft size={15} />
            Voltar para o AlePejo Serviços
          </Link>
        </Reveal>
      </section>

      <ContactSection
        title="Fale sobre os planos"
        description="Conta pra gente o que seu negócio precisa — avaliamos o plano ideal com você."
      />

      <MarketingFooter page="servicos-planos" />
    </div>
  );
}
