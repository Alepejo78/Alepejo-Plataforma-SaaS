import Link from "next/link";
import {
  ArrowRight,
  Bell,
  CalendarCheck,
  Car,
  Gift,
  HeartPulse,
  MessageCircle,
  Palette,
  PawPrint,
  Scissors,
  Smile,
  Sparkles,
  Stethoscope,
} from "lucide-react";

import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { ContactSection } from "@/components/marketing/ContactSection";
import { SegmentIconsBackground } from "@/components/marketing/SegmentIconsBackground";
import "@/components/marketing/vibrant.css";

const NAV_LINKS = [
  { label: "Recursos", href: "/servicos#recursos" },
  { label: "Segmentos", href: "/servicos#segmentos" },
  { label: "Contato", href: "/servicos#contato" },
];

const SEGMENTS = [
  { label: "Barbearia", icon: Scissors },
  { label: "Salão de beleza / cabeleireiro", icon: Sparkles },
  { label: "Manicure, pedicure e esmalteria", icon: Sparkles },
  { label: "Maquiagem", icon: Palette },
  { label: "Estética, depilação e sobrancelhas", icon: Sparkles },
  { label: "Saúde e bem-estar", icon: HeartPulse },
  { label: "Odontologia", icon: Smile },
  { label: "Clínica de estética / saúde", icon: Stethoscope },
  { label: "Pet shop, banho e tosa", icon: PawPrint },
  { label: "Estética automotiva", icon: Car },
];

const FEATURES = [
  {
    icon: CalendarCheck,
    title: "Link de agendamento próprio",
    description:
      "Seu cliente escolhe serviço, profissional e horário sozinho, num link com a cara do seu negócio.",
  },
  {
    icon: Bell,
    title: "Lembretes automáticos",
    description:
      "Confirmação e lembrete por WhatsApp — menos falta, mais agenda cheia.",
  },
  {
    icon: Gift,
    title: "Fidelidade",
    description:
      "Pontos por atendimento e recompensas configuráveis pra trazer o cliente de volta.",
  },
  {
    icon: MessageCircle,
    title: "Histórico do cliente",
    description:
      "Prontuário, cadastro e histórico de atendimentos guardados — inclusive carteira de vacina pra petshops.",
  },
];

export default function ServicosPage() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <MarketingNav
        links={NAV_LINKS}
        ctaLabel="Ver planos"
        ctaHref="/servicos/planos"
      />

      <section className="relative z-0 overflow-hidden">
        <div
          aria-hidden
          className="vibrant-bg pointer-events-none absolute inset-x-0 top-0 h-[560px] opacity-[0.18]"
        />

        <SegmentIconsBackground />

        <div className="relative mx-auto max-w-4xl px-6 py-24 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">
            <CalendarCheck size={12} className="text-[#db2777]" />
            AlePejo Serviços
          </span>

          <h1 className="mt-6 text-4xl font-bold leading-tight text-[var(--text-primary)] sm:text-5xl">
            Agendamento online pra quem vive de{" "}
            <span className="vibrant-text">atender bem</span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-lg text-[var(--text-muted)]">
            Barbearias, salões, clínicas, petshops e muito mais — seus
            clientes agendam sozinhos, você recebe confirmação e lembrete
            automático, e ainda ganha fidelidade e histórico de cada cliente.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/servicos/planos"
              className="vibrant-banner inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[color:rgb(219_39_119_/_0.3)] transition-transform hover:scale-[1.03]"
            >
              Ver planos e preços
              <ArrowRight size={16} />
            </Link>

            <Link
              href="/servicos#contato"
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-6 py-3 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:border-[var(--border-strong)]"
            >
              Falar com a gente
            </Link>
          </div>
        </div>
      </section>

      <section id="segmentos" className="border-t border-[var(--border)] py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-[var(--text-primary)]">
              Feito para o seu segmento
            </h2>
            <p className="mt-3 text-[var(--text-muted)]">
              Cada segmento tem sua própria linguagem e customização — do
              vocabulário do link público à carteira de vacina do pet.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {SEGMENTS.map((segment) => (
              <div
                key={segment.label}
                className="flex flex-col items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 text-center"
              >
                <span className="vibrant-icon-badge flex h-11 w-11 items-center justify-center rounded-xl">
                  <segment.icon size={20} />
                </span>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {segment.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="recursos"
        className="border-t border-[var(--border)] bg-[var(--surface)] py-20"
      >
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-[var(--text-primary)]">
              Tudo que a sua agenda precisa
            </h2>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-6"
              >
                <span className="vibrant-icon-badge flex h-11 w-11 items-center justify-center rounded-xl">
                  <feature.icon size={20} />
                </span>

                <p className="mt-4 font-semibold text-[var(--text-primary)]">
                  {feature.title}
                </p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--border)] py-20 text-center">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="text-3xl font-bold text-[var(--text-primary)]">
            Pronto pra organizar sua agenda?
          </h2>

          <p className="mt-3 text-[var(--text-muted)]">
            Veja os planos disponíveis e comece a atender com um link só seu.
          </p>

          <Link
            href="/servicos/planos"
            className="vibrant-banner mt-8 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[color:rgb(219_39_119_/_0.3)] transition-transform hover:scale-[1.03]"
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
