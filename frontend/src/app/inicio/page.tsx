import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  Building2,
  CalendarClock,
  HeartHandshake,
  MapPin,
  Sparkles,
  Target,
  Users,
} from "lucide-react";

import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { ContactSection } from "@/components/marketing/ContactSection";
import { WorkWithUs } from "@/components/marketing/WorkWithUs";
import "@/components/marketing/aurora.css";

const NAV_LINKS = [
  { label: "Sobre", href: "/inicio#sobre" },
  { label: "Serviços prestados", href: "/inicio#oferecemos" },
  { label: "Trabalhe conosco", href: "/inicio#trabalhe-conosco" },
  { label: "Contato", href: "/inicio#contato" },
];

const VALUES = [
  {
    icon: Target,
    title: "Foco no resultado do cliente",
    description:
      "Cada módulo e cada tela existem pra resolver um problema real de quem gerencia um negócio no dia a dia.",
  },
  {
    icon: HeartHandshake,
    title: "Suporte de verdade",
    description:
      "Atendimento próximo, em português, com gente que conhece o sistema — não um robô de FAQ.",
  },
  {
    icon: Sparkles,
    title: "Sempre evoluindo",
    description:
      "Novos recursos entram com frequência, ouvindo quem usa o sistema todos os dias.",
  },
];

export default function InicioPage() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <MarketingNav links={NAV_LINKS} />

      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="aurora-bg pointer-events-none absolute inset-x-0 top-0 h-[520px] opacity-[0.12]"
        />

        <div className="relative mx-auto max-w-5xl px-6 py-24 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">
            <Building2 size={12} className="text-[var(--primary)]" />
            AlePejo Assessoria e Prestação de Serviços
          </span>

          <h1 className="mt-6 text-4xl font-bold leading-tight text-[var(--text-primary)] sm:text-5xl">
            Tecnologia e assessoria para{" "}
            <span className="aurora-text">pequenos e médios negócios</span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-lg text-[var(--text-muted)]">
            Somos uma empresa de assessoria e prestação de serviços que também
            desenvolve os próprios sistemas: um ERP completo para gestão da
            empresa e uma plataforma de agendamento para quem atende clientes
            todos os dias.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <Link
              href="/institucional"
              className="group flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-left transition-colors hover:border-[var(--primary)]"
            >
              <div>
                <p className="flex items-center gap-2 font-semibold text-[var(--text-primary)]">
                  <Boxes size={18} className="text-[var(--primary)]" />
                  Produto ERP
                </p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Estoque, compras, vendas, financeiro e RH num só sistema.
                </p>
              </div>

              <ArrowRight
                size={20}
                className="shrink-0 text-[var(--text-muted)] transition-transform group-hover:translate-x-1"
              />
            </Link>

            <Link
              href="/servicos"
              className="group flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-left transition-colors hover:border-[var(--primary)]"
            >
              <div>
                <p className="flex items-center gap-2 font-semibold text-[var(--text-primary)]">
                  <CalendarClock size={18} className="text-[var(--primary)]" />
                  Serviços
                </p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Agendamento online e atendimento para o seu negócio.
                </p>
              </div>

              <ArrowRight
                size={20}
                className="shrink-0 text-[var(--text-muted)] transition-transform group-hover:translate-x-1"
              />
            </Link>
          </div>
        </div>
      </section>

      <section id="sobre" className="border-t border-[var(--border)] py-20">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-3xl font-bold text-[var(--text-primary)]">
              Sobre a AlePejo
            </h2>

            <p className="mt-4 text-[var(--text-muted)]">
              Nascemos prestando assessoria para pequenas e médias empresas e,
              com o tempo, passamos a desenvolver nossos próprios sistemas
              para resolver os mesmos problemas que via nos nossos clientes:
              controle de estoque bagunçado, agenda de atendimento no papel,
              financeiro sem visão clara do fluxo de caixa.
            </p>

            <p className="mt-4 text-[var(--text-muted)]">
              Hoje somos uma empresa que une consultoria e tecnologia — o
              suporte que dá pra sua empresa e os sistemas que constrói andam
              juntos, sem depender de terceiros.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-1">
            {VALUES.map((value) => (
              <div
                key={value.title}
                className="flex items-start gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
              >
                <span className="aurora-icon-badge flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                  <value.icon size={18} />
                </span>

                <div>
                  <p className="font-semibold text-[var(--text-primary)]">
                    {value.title}
                  </p>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    {value.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="oferecemos"
        className="border-t border-[var(--border)] bg-[var(--surface)] py-20"
      >
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-[var(--text-primary)]">
              Serviços prestados
            </h2>
            <p className="mt-3 text-[var(--text-muted)]">
              Dois produtos, um só compromisso: simplificar a gestão do seu
              negócio.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <div className="flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--background)] p-8">
              <span className="aurora-icon-badge flex h-12 w-12 items-center justify-center rounded-xl">
                <Boxes size={22} />
              </span>

              <h3 className="mt-5 text-xl font-bold text-[var(--text-primary)]">
                AlePejo ERP Cloud
              </h3>

              <p className="mt-2 flex-1 text-sm text-[var(--text-muted)]">
                Gestão completa da empresa: estoque, compras, vendas,
                financeiro com fluxo de caixa, RH com folha de pagamento e
                ponto, produção e multiunidade — tudo online, sem limite de
                usuários.
              </p>

              <Link
                href="/institucional"
                className="mt-6 inline-flex items-center gap-1.5 font-semibold text-[var(--primary)] hover:underline"
              >
                Conhecer o ERP
                <ArrowRight size={16} />
              </Link>
            </div>

            <div className="flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--background)] p-8">
              <span className="aurora-icon-badge flex h-12 w-12 items-center justify-center rounded-xl">
                <CalendarClock size={22} />
              </span>

              <h3 className="mt-5 text-xl font-bold text-[var(--text-primary)]">
                AlePejo Serviços
              </h3>

              <p className="mt-2 flex-1 text-sm text-[var(--text-muted)]">
                Agendamento online para salões, barbearias, clínicas,
                petshops e outros negócios de atendimento — com link público
                de agendamento, lembretes, fidelidade e histórico do cliente.
              </p>

              <Link
                href="/servicos"
                className="mt-6 inline-flex items-center gap-1.5 font-semibold text-[var(--primary)] hover:underline"
              >
                Conhecer o Serviços
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--border)] py-16">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-4 px-6 text-sm text-[var(--text-muted)]">
          <span className="flex items-center gap-2">
            <Users size={16} className="text-[var(--primary)]" />
            Suporte próximo, sem robô de atendimento
          </span>
          <span className="flex items-center gap-2">
            <MapPin size={16} className="text-[var(--primary)]" />
            Atendimento remoto ou presencial em todo o Brasil
          </span>
        </div>
      </section>

      <WorkWithUs />

      <ContactSection />

      <MarketingFooter page="inicio" />
    </div>
  );
}
