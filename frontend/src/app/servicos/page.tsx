import Link from "next/link";
import type { CSSProperties } from "react";
import {
  ArrowRight,
  Bell,
  CalendarCheck,
  Gift,
  MessageCircle,
  PawPrint,
  Scissors,
  Smartphone,
  Sparkles,
} from "lucide-react";

import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { ContactSection } from "@/components/marketing/ContactSection";
import { SegmentIconsBackground } from "@/components/marketing/SegmentIconsBackground";
import { ServicosDemoTour } from "@/components/marketing/ServicosDemoTour";
import { SERVICE_SEGMENTS } from "@/components/marketing/segments-data";
import { marketingFontVars } from "@/components/marketing/fonts";
import { Reveal } from "@/components/marketing/Reveal";
import "@/components/marketing/vibrant.css";
import "@/components/marketing/marketing-shared.css";

const NAV_LINKS = [
  { label: "Recursos", href: "/servicos#recursos" },
  { label: "Segmentos", href: "/servicos#segmentos" },
  { label: "Contato", href: "/servicos#contato" },
];

const HERO_TICKETS: {
  icon: typeof Scissors;
  label: string;
  time: string;
  tone: string;
  style: CSSProperties;
}[] = [
  {
    icon: Scissors,
    label: "Barbearia",
    time: "14:00 · Corte + barba",
    tone: "var(--mkt-accent)",
    style: { top: 0, left: 0, transform: "rotate(-7deg)", zIndex: 3 },
  },
  {
    icon: Sparkles,
    label: "Salão",
    time: "10:30 · Escova",
    tone: "var(--mkt-accent-2)",
    style: { top: "24%", right: 0, transform: "rotate(4deg)", zIndex: 2 },
  },
  {
    icon: PawPrint,
    label: "Petshop",
    time: "16:15 · Banho e tosa",
    tone: "var(--mkt-accent-3)",
    style: { top: "50%", left: "12%", transform: "rotate(-3deg)", zIndex: 1 },
  },
];

const FEATURES = [
  {
    icon: CalendarCheck,
    title: "Link de agendamento próprio",
    description:
      "Seu cliente escolhe serviço, profissional e horário sozinho, num link com a cara do seu negócio — sem grupo de WhatsApp lotado nem caderninho.",
  },
  {
    icon: Bell,
    title: "Lembretes automáticos",
    description: "Confirmação e lembrete por WhatsApp — menos falta, mais agenda cheia.",
  },
  {
    icon: Gift,
    title: "Fidelidade",
    description: "Pontos por atendimento e resgate configurável pra trazer o cliente de volta.",
  },
  {
    icon: MessageCircle,
    title: "Histórico do cliente",
    description: "Cadastro e histórico de atendimentos guardados — inclusive carteira de vacina pra petshops.",
  },
  {
    icon: Smartphone,
    title: "App do profissional",
    description:
      "Pelo celular, cada profissional acompanha a própria agenda e o faturamento — sem precisar abrir o sistema completo.",
  },
];

export default function ServicosPage() {
  return (
    <div className={`${marketingFontVars} marketing-page theme-vibrant`}>
      <MarketingNav
        links={NAV_LINKS}
        ctaLabel="Ver planos"
        ctaHref="/servicos/planos"
      />

      <section className="relative z-0 overflow-hidden">
        <div aria-hidden className="mkt-dotgrid pointer-events-none absolute inset-0 opacity-30" />
        <div
          aria-hidden
          className="vibrant-bg pointer-events-none absolute inset-x-0 top-0 h-[560px] opacity-[0.16]"
        />

        <SegmentIconsBackground />

        <div className="relative mx-auto grid max-w-6xl gap-14 px-6 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-28">
          <div>
            <h1 className="font-display text-4xl font-bold leading-[1.08] text-[var(--mkt-ink)] sm:text-5xl lg:text-[3.3rem]">
              Marcação de horário sem grupo de WhatsApp lotado, planilha ou
              caderninho.
            </h1>

            <p className="mt-6 max-w-xl text-lg text-[var(--mkt-muted)]">
              Barbearias, salões, clínicas, petshops e outros negócios de
              atendimento: o cliente escolhe o horário sozinho, você recebe
              confirmação e lembrete automático no WhatsApp — e ainda ganha
              fidelidade e histórico de cada cliente.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link
                href="/servicos/planos"
                className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(120deg,var(--mkt-accent),var(--mkt-accent-2))] px-6 py-3 text-sm font-semibold text-[var(--mkt-contrast)] shadow-lg shadow-[color:color-mix(in_srgb,var(--mkt-accent)_35%,transparent)] transition-transform hover:scale-[1.03]"
              >
                Ver planos e preços
                <ArrowRight size={16} />
              </Link>

              <Link
                href="/servicos#contato"
                className="inline-flex items-center gap-2 rounded-full border border-[var(--mkt-border)] px-6 py-3 text-sm font-semibold text-[var(--mkt-ink)] transition-colors hover:border-[var(--mkt-accent)]"
              >
                Falar com a gente
              </Link>
            </div>
          </div>

          <Reveal className="relative h-[320px] sm:h-[360px]">
            {HERO_TICKETS.map((ticket) => (
              <div
                key={ticket.label}
                className="mkt-ticket mkt-panel absolute w-[72%] p-5"
                style={
                  {
                    ...ticket.style,
                    "--mkt-ticket-punch": "var(--mkt-bg)",
                  } as CSSProperties
                }
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-white"
                    style={{ background: ticket.tone }}
                  >
                    <ticket.icon size={17} />
                  </span>
                  <div>
                    <p className="font-display text-sm font-semibold text-[var(--mkt-ink)]">
                      {ticket.label}
                    </p>
                    <p className="text-xs text-[var(--mkt-muted)]">{ticket.time}</p>
                  </div>
                </div>
                <div className="mkt-ticket-divider mt-3 pt-2 text-[11px] font-medium text-[var(--mkt-accent-3)]">
                  Confirmado no WhatsApp
                </div>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      <Reveal as="section" id="segmentos" className="border-t border-[var(--mkt-border)] py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-bold text-[var(--mkt-ink)]">
              Feito para o seu segmento
            </h2>
            <p className="mt-3 text-[var(--mkt-muted)]">
              Cada segmento tem sua própria linguagem e customização — do
              vocabulário do link público à carteira de vacina do pet.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {SERVICE_SEGMENTS.map((segment, index) => (
              <div
                key={segment.label}
                className="mkt-panel mkt-panel-lift flex flex-col items-center gap-3 p-5 text-center"
                style={{ transform: index % 2 === 1 ? "translateY(14px)" : undefined }}
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[linear-gradient(135deg,var(--mkt-accent),var(--mkt-accent-2))] text-white">
                  <segment.icon size={20} />
                </span>
                <p className="text-sm font-medium text-[var(--mkt-ink)]">{segment.label}</p>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal as="section" className="border-t border-[var(--mkt-border)] py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <span className="mx-auto inline-flex items-center gap-1.5 rounded-full border border-[var(--mkt-border)] px-3 py-1 text-xs font-semibold text-[var(--mkt-accent)]">
              Veja por dentro
            </span>
            <h2 className="font-display mt-4 text-3xl font-bold text-[var(--mkt-ink)]">
              Como fica na prática
            </h2>
            <p className="mt-3 text-[var(--mkt-muted)]">
              Do prontuário do cliente ao link que ele usa pra marcar sozinho.
            </p>
          </div>

          <div className="mt-12">
            <ServicosDemoTour />
          </div>
        </div>
      </Reveal>

      <Reveal
        as="section"
        id="recursos"
        className="border-t border-[var(--mkt-border)] bg-[var(--mkt-bg-alt)] py-20"
      >
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="font-display text-3xl font-bold text-[var(--mkt-ink)]">
            Tudo que a sua agenda precisa
          </h2>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="mkt-panel mkt-panel-lift p-7">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[linear-gradient(135deg,var(--mkt-accent),var(--mkt-accent-2))] text-white">
                  <feature.icon size={20} />
                </span>

                <p className="font-display mt-4 font-semibold text-[var(--mkt-ink)]">
                  {feature.title}
                </p>
                <p className="mt-1.5 text-sm text-[var(--mkt-muted)]">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      <section className="border-t border-[var(--mkt-border)] py-20 text-center">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="font-display text-3xl font-bold text-[var(--mkt-ink)]">
            Pronto pra organizar sua agenda?
          </h2>

          <p className="mt-3 text-[var(--mkt-muted)]">
            Veja os planos disponíveis e comece a atender com um link só seu.
          </p>

          <Link
            href="/servicos/planos"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-[linear-gradient(120deg,var(--mkt-accent),var(--mkt-accent-2))] px-6 py-3 text-sm font-semibold text-[var(--mkt-contrast)] shadow-lg shadow-[color:color-mix(in_srgb,var(--mkt-accent)_35%,transparent)] transition-transform hover:scale-[1.03]"
          >
            Ver planos e preços
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <ContactSection
        title="Fale sobre o AlePejo Serviços"
        description="Quer saber se o Serviços atende o seu segmento? Manda uma mensagem."
      />

      <MarketingFooter page="servicos" />
    </div>
  );
}
