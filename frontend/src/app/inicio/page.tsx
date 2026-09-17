import Link from "next/link";
import type { CSSProperties } from "react";
import {
  ArrowRight,
  Boxes,
  Building2,
  CalendarClock,
  MapPin,
  ShoppingCart,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { ContactSection } from "@/components/marketing/ContactSection";
import { SystemsStackedCards } from "@/components/marketing/SystemsStackedCards";
import { SERVICE_SEGMENTS } from "@/components/marketing/segments-data";
import { marketingFontVars } from "@/components/marketing/fonts";
import "@/components/marketing/aurora.css";
import "@/components/marketing/marketing-shared.css";
import { Reveal } from "@/components/marketing/Reveal";

const ERP_MODULES = [
  { label: "Estoque", icon: Boxes },
  { label: "Compras e vendas", icon: ShoppingCart },
  { label: "Financeiro", icon: Wallet },
  { label: "RH e folha", icon: Users },
  { label: "Multiunidade", icon: Building2 },
  { label: "Indicadores", icon: TrendingUp },
];

const NAV_LINKS = [
  { label: "Sobre", href: "/inicio#sobre" },
  { label: "Nossos sistemas", href: "/inicio#sistemas" },
  { label: "Contato", href: "/inicio#contato" },
];

const TIMELINE = [
  {
    cell: "A1",
    title: "Onde tudo começou",
    text: "A AlePejo nasceu como assessoria: planilhas de Excel sob medida e aulas particulares, individuais, sempre indo direto no que cada aluno realmente precisava aprender — nada de curso engessado. Junto com isso vieram as primeiras consultorias de processos para pequenas empresas.",
  },
  {
    cell: "B1",
    title: "Da planilha para a automação",
    text: "Construir planilhas para controle financeiro, estoque, gestão de RH e outras rotinas mostrou de perto onde o Excel começava a travar. A resposta foi automatizar com VBA — as planilhas deixaram de ser um relatório à parte e passaram a fazer parte do trabalho.",
  },
  {
    cell: "C1",
    title: "Nasce o AlePejo ERP Cloud",
    text: "Mesmo automatizada, a planilha tinha limite. Daí nasceu o AlePejo ERP Cloud: um sistema em nuvem que uniu estoque, compras, vendas, financeiro e RH num só lugar — feito pra ficar de fato no dia a dia do empresário, não guardado numa gaveta.",
  },
  {
    cell: "D1",
    title: "Agora, o AlePejo Serviços e Agendamentos",
    text: "Com o ERP resolvendo a gestão interna, faltava quem vive de atender cliente marcando hora. Nasceu o AlePejo Serviços e Agendamentos, pra facilitar a agenda de quem atende nestes segmentos:",
  },
];

export default function InicioPage() {
  return (
    <div className={`${marketingFontVars} marketing-page theme-aurora`}>
      <MarketingNav
        links={NAV_LINKS}
        ctaLabel="AlePejo Serviços"
        ctaHref="/servicos"
        secondaryCtaLabel="AlePejo ERP"
        secondaryCtaHref="/institucional"
      />

      <section className="relative overflow-hidden">
        <div aria-hidden className="mkt-dotgrid pointer-events-none absolute inset-0 opacity-40" />
        <div
          aria-hidden
          className="aurora-bg pointer-events-none absolute inset-x-0 top-0 h-[560px] opacity-[0.14]"
        />

        <div className="relative mx-auto grid max-w-6xl gap-14 px-6 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-28">
          <div>
            <h1 className="font-display text-4xl font-bold leading-[1.08] text-[var(--mkt-ink)] sm:text-5xl lg:text-[3.4rem]">
              De uma planilha de Excel a dois sistemas que já cuidam do seu
              negócio.
            </h1>

            <p className="mt-6 max-w-xl text-lg text-[var(--mkt-muted)]">
              Somos a AlePejo: consultoria que virou tecnologia. Hoje
              mantemos um ERP completo para a gestão da empresa e o AlePejo
              Serviços, para quem vive de atender e agendar clientes.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link
                href="/servicos"
                className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(120deg,var(--mkt-accent),var(--mkt-accent-2))] px-6 py-3 text-sm font-semibold text-[var(--mkt-contrast)] shadow-lg shadow-[color:color-mix(in_srgb,var(--mkt-accent)_35%,transparent)] transition-transform hover:scale-[1.03]"
              >
                Ver o AlePejo Serviços
                <ArrowRight size={16} />
              </Link>

              <Link
                href="/institucional"
                className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(120deg,var(--mkt-accent-2),var(--mkt-accent-3))] px-6 py-3 text-sm font-semibold text-[var(--mkt-contrast)] shadow-lg shadow-[color:color-mix(in_srgb,var(--mkt-accent-2)_35%,transparent)] transition-transform hover:scale-[1.03]"
              >
                <Boxes size={16} />
                Conhecer o ERP completo
              </Link>
            </div>
          </div>

          <Reveal>
            <SystemsStackedCards />
          </Reveal>
        </div>
      </section>

      <Reveal as="section" id="sobre" className="border-t border-[var(--mkt-border)] py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="font-display text-3xl font-bold text-[var(--mkt-ink)]">
            Sobre a AlePejo
          </h2>

          <div className="mkt-timeline mt-12 space-y-10 pl-11">
            {TIMELINE.map((step) => (
              <div key={step.cell} className="relative">
                <span className="mkt-timeline-marker absolute -left-11 top-0 flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--mkt-surface)] text-xs font-bold text-[var(--mkt-accent)] ring-2 ring-[var(--mkt-border)]">
                  {step.cell}
                </span>
                <h3 className="font-display text-lg font-semibold text-[var(--mkt-ink)]">
                  {step.title}
                </h3>
                <p className="mt-2 max-w-2xl text-[var(--mkt-muted)]">{step.text}</p>

                {step.cell === "C1" && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {ERP_MODULES.map((module) => (
                      <span
                        key={module.label}
                        className="mkt-chip inline-flex cursor-default items-center gap-1.5 rounded-full border border-[var(--mkt-border)] bg-[var(--mkt-surface)] px-3 py-1.5 text-xs font-medium text-[var(--mkt-ink)]"
                      >
                        <module.icon size={13} className="text-[var(--mkt-accent)]" />
                        {module.label}
                      </span>
                    ))}
                  </div>
                )}

                {step.cell === "D1" && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {SERVICE_SEGMENTS.map((segment) => (
                      <span
                        key={segment.label}
                        className="mkt-chip inline-flex cursor-default items-center gap-1.5 rounded-full border border-[var(--mkt-border)] bg-[var(--mkt-surface)] px-3 py-1.5 text-xs font-medium text-[var(--mkt-ink)]"
                      >
                        <segment.icon size={13} className="text-[var(--mkt-accent-2)]" />
                        {segment.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal
        as="section"
        id="sistemas"
        className="border-t border-[var(--mkt-border)] bg-[var(--mkt-bg-alt)] py-20"
      >
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="font-display text-3xl font-bold text-[var(--mkt-ink)]">
            Dois sistemas, um só compromisso
          </h2>
          <p className="mt-3 max-w-xl text-[var(--mkt-muted)]">
            Simplificar a gestão do seu negócio — por dentro e no atendimento
            ao cliente.
          </p>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <div
              className="mkt-panel mkt-panel-lift flex flex-col p-8"
              style={
                {
                  "--panel-accent": "var(--mkt-accent)",
                  background:
                    "radial-gradient(120% 120% at 0% 0%, color-mix(in srgb, var(--mkt-accent) 10%, var(--mkt-surface)), var(--mkt-surface))",
                } as CSSProperties
              }
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[linear-gradient(135deg,var(--mkt-accent),var(--mkt-accent-2))] text-white">
                <Boxes size={22} />
              </span>

              <h3 className="font-display mt-5 text-xl font-bold text-[var(--mkt-ink)]">
                AlePejo ERP Cloud
              </h3>

              <p className="mt-2 text-sm text-[var(--mkt-muted)]">
                Gestão completa da empresa: estoque, compras, vendas,
                financeiro com fluxo de caixa, RH com folha de pagamento e
                ponto, produção e multiunidade — tudo online.
              </p>

              <ul className="mt-3 flex-1 space-y-1.5 text-sm text-[var(--mkt-muted)]">
                <li>• Controle de estoque com alerta de reposição</li>
                <li>• Fluxo de caixa e contas a pagar/receber</li>
                <li>• Ponto e folha de pagamento da equipe</li>
                <li>• Multiunidade: matriz e filiais no mesmo lugar</li>
              </ul>

              <div className="mt-5 flex flex-wrap gap-2">
                {["Estoque", "Financeiro", "RH e folha", "Multiunidade"].map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-[var(--mkt-surface-2)] px-3 py-1 text-xs font-medium text-[var(--mkt-ink)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <Link
                href="/institucional"
                className="mt-6 inline-flex items-center gap-1.5 font-semibold text-[var(--mkt-accent)] hover:underline"
              >
                Conhecer o ERP
                <ArrowRight size={16} />
              </Link>
            </div>

            <div
              className="mkt-panel mkt-panel-lift flex flex-col p-8"
              style={
                {
                  "--panel-accent": "#db2777",
                  background:
                    "radial-gradient(120% 120% at 100% 0%, color-mix(in srgb, #db2777 10%, var(--mkt-surface)), var(--mkt-surface))",
                } as CSSProperties
              }
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#db2777,#ea580c)] text-white">
                <CalendarClock size={22} />
              </span>

              <h3 className="font-display mt-5 text-xl font-bold text-[var(--mkt-ink)]">
                AlePejo Serviços
              </h3>

              <p className="mt-2 text-sm text-[var(--mkt-muted)]">
                Agendamento online para salões, barbearias, clínicas,
                petshops e outros negócios de atendimento — link público,
                lembretes, fidelidade e histórico do cliente.
              </p>

              <ul className="mt-3 flex-1 space-y-1.5 text-sm text-[var(--mkt-muted)]">
                <li>• Link de agendamento com a cara do seu negócio</li>
                <li>• Confirmação e lembrete automático no WhatsApp</li>
                <li>• Prontuário e, pra petshop, carteira de vacina</li>
                <li>• Pontos de fidelidade pra trazer o cliente de volta</li>
              </ul>

              <div className="mt-5 flex flex-wrap gap-2">
                {["Agenda online", "Lembretes no WhatsApp", "Fidelidade", "Prontuário"].map(
                  (tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-[var(--mkt-surface-2)] px-3 py-1 text-xs font-medium text-[var(--mkt-ink)]"
                    >
                      {tag}
                    </span>
                  )
                )}
              </div>

              <Link
                href="/servicos"
                className="mt-6 inline-flex items-center gap-1.5 font-semibold text-[#db2777] hover:underline"
              >
                Conhecer o Serviços
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </Reveal>

      <div className="border-t border-[var(--mkt-border)] py-14">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-4 px-6 text-sm text-[var(--mkt-muted)]">
          <span className="flex items-center gap-2">
            <Users size={16} className="text-[var(--mkt-accent)]" />
            Suporte próximo, sem robô de atendimento
          </span>
          <span className="flex items-center gap-2">
            <MapPin size={16} className="text-[var(--mkt-accent)]" />
            Atendimento remoto em todo o Brasil, presencial a negociar
          </span>
        </div>
      </div>

      <ContactSection />

      <MarketingFooter page="inicio" />
    </div>
  );
}
