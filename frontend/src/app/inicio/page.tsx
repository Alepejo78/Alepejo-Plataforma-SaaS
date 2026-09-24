import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  Building2,
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
import { erpBody, servicosDisplay } from "@/components/marketing/fonts";
import { Reveal } from "@/components/marketing/Reveal";
import "@/components/marketing/marketing-shared.css";
import "@/components/marketing/servicos.css";
import "@/components/marketing/erp.css";
import "@/components/marketing/inicio.css";

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
    <div className={`${servicosDisplay.variable} ${erpBody.variable} marketing-page theme-inicio`}>
      <MarketingNav
        links={NAV_LINKS}
        ctaLabel="AlePejo Serviços"
        ctaHref="/servicos"
        secondaryCtaLabel="AlePejo ERP"
        secondaryCtaHref="/institucional"
      />

      {/* Abertura */}
      <section className="in-hero">
        <div className="mx-auto grid max-w-7xl gap-14 px-6 pb-20 pt-16 lg:min-h-[calc(100dvh-4.5rem)] lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:items-center lg:gap-12 lg:py-20">
          <div className="max-w-2xl">
            <p className="in-rise mkt-eyebrow" style={{ ["--i" as string]: 0 }}>
              AlePejo Assessoria e Prestação de Serviços
            </p>
            <h1
              className="in-rise font-display mt-6 text-4xl font-semibold leading-[1.06] text-[var(--mkt-ink)] sm:text-5xl lg:text-[3.3rem]"
              style={{ ["--i" as string]: 1 }}
            >
              De uma planilha de Excel a dois sistemas que já cuidam do seu negócio.
            </h1>
            <p
              className="in-rise mt-6 max-w-[54ch] text-lg leading-relaxed text-[var(--mkt-muted)]"
              style={{ ["--i" as string]: 2 }}
            >
              Somos a AlePejo: consultoria que virou tecnologia. Hoje mantemos um ERP completo para a gestão da empresa
              e o AlePejo Serviços, para quem vive de atender e agendar clientes.
            </p>

            <div className="in-rise mt-9 flex flex-wrap items-center gap-3" style={{ ["--i" as string]: 3 }}>
              <Link href="/servicos" className="sv-btn sv-btn-gold">
                Ver o AlePejo Serviços
                <ArrowRight size={17} aria-hidden />
              </Link>
              <Link href="/institucional" className="erp-btn erp-btn-primary">
                <Boxes size={17} aria-hidden />
                Conhecer o ERP completo
              </Link>
            </div>
          </div>

          <div className="in-rise" style={{ ["--i" as string]: 3 }}>
            <SystemsStackedCards />
            <p className="mt-4 text-xs text-[var(--mkt-muted)]">
              Capturas dos sistemas reais, com dados fictícios de demonstração.
            </p>
          </div>
        </div>
      </section>

      {/* Sobre */}
      <Reveal as="section" id="sobre" className="scroll-mt-20 bg-[var(--mkt-bg-alt)] py-24">
        <div className="mx-auto grid max-w-7xl gap-14 px-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className="mkt-eyebrow">Sobre a AlePejo</p>
            <h2 className="font-display mt-5 text-3xl font-semibold leading-tight text-[var(--mkt-ink)] sm:text-4xl">
              Do Excel ao sistema em nuvem.
            </h2>
          </div>

          <ol className="divide-y divide-[var(--mkt-border)] border-y border-[var(--mkt-border)]">
            {TIMELINE.map((step) => (
              <li key={step.cell} className="in-step grid grid-cols-[3.5rem_1fr] gap-x-5 py-8">
                <span className="in-cell flex h-9 w-14 items-center justify-center rounded-md border border-[var(--mkt-border)] bg-[var(--mkt-surface)] text-xs font-bold text-[var(--mkt-accent)]">
                  {step.cell}
                </span>
                <div>
                  <h3 className="font-display text-xl font-semibold text-[var(--mkt-ink)]">{step.title}</h3>
                  <p className="mt-2 max-w-[62ch] leading-relaxed text-[var(--mkt-muted)]">{step.text}</p>

                  {step.cell === "C1" && (
                    <ul className="mt-5 flex flex-wrap gap-2">
                      {ERP_MODULES.map((module) => (
                        <li
                          key={module.label}
                          className="in-chip inline-flex items-center gap-1.5 rounded-full border border-[var(--mkt-border)] bg-[var(--mkt-surface)] px-3 py-1.5 text-xs font-medium text-[var(--mkt-ink)]"
                        >
                          <module.icon size={13} className="text-[var(--mkt-accent)]" aria-hidden />
                          {module.label}
                        </li>
                      ))}
                    </ul>
                  )}

                  {step.cell === "D1" && (
                    <ul className="mt-5 flex flex-wrap gap-2">
                      {SERVICE_SEGMENTS.map((segment) => (
                        <li
                          key={segment.label}
                          className="in-chip inline-flex items-center gap-1.5 rounded-full border border-[var(--mkt-border)] bg-[var(--mkt-surface)] px-3 py-1.5 text-xs font-medium text-[var(--mkt-ink)]"
                        >
                          <segment.icon size={13} className="text-[var(--mkt-accent-2)]" aria-hidden />
                          {segment.label}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Reveal>

      {/* Os dois sistemas */}
      <Reveal as="section" id="sistemas" className="scroll-mt-20 bg-[var(--mkt-bg)] py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-14 max-w-2xl">
            <p className="mkt-eyebrow">Nossos sistemas</p>
            <h2 className="font-display mt-5 text-3xl font-semibold leading-tight text-[var(--mkt-ink)] sm:text-4xl">
              Dois sistemas, um só compromisso.
            </h2>
            <p className="mt-4 leading-relaxed text-[var(--mkt-muted)]">
              Simplificar a gestão do seu negócio — por dentro e no atendimento ao cliente.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <article className="in-door in-door-erp">
              <div className="p-8 pb-0 sm:p-10 sm:pb-0">
                <span className="mkt-eyebrow !text-[var(--erp-blue)]">Gestão da empresa</span>
                <h3 className="font-display mt-4 text-2xl font-semibold">AlePejo ERP Cloud</h3>
                <p className="mt-3 max-w-[48ch] text-[15px] leading-relaxed text-[var(--erp-ice)]/80">
                  Estoque, compras, vendas, financeiro com fluxo de caixa, RH com folha e ponto, produção e multiunidade,
                  tudo online.
                </p>
                <ul className="mt-4 space-y-1.5 text-sm text-[var(--erp-ice)]/80">
                  <li>• Estoque por depósito, com contagem de inventário</li>
                  <li>• Fluxo de caixa e contas a pagar e a receber</li>
                  <li>• Ponto, holerite e folha de pagamento da equipe</li>
                  <li>• Multiunidade: matriz e filiais no mesmo lugar</li>
                </ul>
                <Link href="/institucional" className="erp-btn erp-btn-primary mt-6">
                  Conhecer o ERP
                  <ArrowRight size={17} aria-hidden />
                </Link>
              </div>
              <div className="in-door-shot mt-auto">
                <Image
                  src="/marketing/erp/receber.webp"
                  alt="Contas a receber do AlePejo ERP Cloud"
                  width={1600}
                  height={757}
                  sizes="(min-width: 1024px) 40vw, 90vw"
                />
              </div>
            </article>

            <article className="in-door in-door-srv">
              <div className="p-8 pb-0 sm:p-10 sm:pb-0">
                <span className="mkt-eyebrow !text-[var(--sv-gold)]">Agenda e atendimento</span>
                <h3 className="font-display mt-4 text-2xl font-semibold">AlePejo Serviços</h3>
                <p className="mt-3 max-w-[48ch] text-[15px] leading-relaxed text-[var(--sv-cream)]/80">
                  Agendamento online para salões, barbearias, clínicas, petshops e outros negócios de atendimento: link
                  público, lembretes, fidelidade e histórico do cliente.
                </p>
                <ul className="mt-4 space-y-1.5 text-sm text-[var(--sv-cream)]/80">
                  <li>• Link de agendamento com a cara do seu negócio</li>
                  <li>• Confirmação e lembrete automático no WhatsApp</li>
                  <li>• Prontuário e, para petshop, carteira de vacinação</li>
                  <li>• Pontos de fidelidade para trazer o cliente de volta</li>
                </ul>
                <Link href="/servicos" className="sv-btn sv-btn-gold mt-6">
                  Conhecer o Serviços
                  <ArrowRight size={17} aria-hidden />
                </Link>
              </div>
              <div className="in-door-shot mt-auto">
                <Image
                  src="/marketing/servicos/cliente.webp"
                  alt="Ficha do cliente do AlePejo Serviços"
                  width={1600}
                  height={659}
                  sizes="(min-width: 1024px) 40vw, 90vw"
                />
              </div>
            </article>
          </div>
        </div>
      </Reveal>

      <div className="border-y border-[var(--mkt-border)] bg-[var(--mkt-bg-alt)] py-12">
        <ul className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-12 gap-y-4 px-6 text-sm text-[var(--mkt-muted)]">
          <li className="flex items-center gap-2">
            <Users size={16} className="text-[var(--mkt-accent)]" aria-hidden />
            Suporte próximo, sem robô de atendimento
          </li>
          <li className="flex items-center gap-2">
            <MapPin size={16} className="text-[var(--mkt-accent)]" aria-hidden />
            Atendimento remoto em todo o Brasil, presencial a negociar
          </li>
        </ul>
      </div>

      <ContactSection />

      <MarketingFooter page="inicio" />
    </div>
  );
}
