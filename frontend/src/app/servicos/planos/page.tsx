"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Bell, Check, Gift, Link as LinkIcon, Star } from "lucide-react";

import { getServicosPublicPlans, type ServicosPlan } from "@/services/servicos-planos.service";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { ContactSection } from "@/components/marketing/ContactSection";
import { servicosFontVars } from "@/components/marketing/fonts";
import { Reveal } from "@/components/marketing/Reveal";
import "@/components/marketing/marketing-shared.css";
import "@/components/marketing/servicos.css";

function money(value: string | null) {
  if (value == null) return null;
  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function num(value: string | null) {
  return Number(value ?? 0);
}

/** Frontend do AlePejoServiços (produto irmão) — onde o cadastro/assinatura de verdade acontece. */
const SERVICOS_APP_URL = "https://apps.alepejo.com.br";

function signupUrl(planId: string, cycle: "MONTHLY" | "YEARLY") {
  const params = new URLSearchParams({ planId, cycle });
  return `${SERVICOS_APP_URL}/painel/cadastro?${params.toString()}`;
}

/** "Comprar agora" paga ANTES do cadastro existir — mesmo padrão do /checkout do ERP. */
function checkoutUrl(planId: string, cycle: "MONTHLY" | "YEARLY") {
  const params = new URLSearchParams({ planId, cycle });
  return `${SERVICOS_APP_URL}/painel/checkout?${params.toString()}`;
}

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

export default function ServicosPlanosPage() {
  const [plans, setPlans] = useState<ServicosPlan[] | null>(null);
  const [trialDays, setTrialDays] = useState<number | null>(null);
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "YEARLY">("MONTHLY");

  useEffect(() => {
    getServicosPublicPlans()
      .then((res) => {
        setPlans(res.plans);
        setTrialDays(res.trialDays);
      })
      .catch(() => setPlans([]));
  }, []);

  return (
    <div className={`${servicosFontVars} marketing-page theme-servicos`}>
      <MarketingNav links={NAV_LINKS} />

      {/* Abertura */}
      <section className="sv-hero">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 pb-20 pt-16 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:items-center lg:py-24">
          <div className="max-w-xl">
            <p className="sv-rise sv-eyebrow" style={{ ["--i" as string]: 0 }}>
              {trialDays ? `${trialDays} dias de teste grátis` : "Planos AlePejo Serviços"}
            </p>
            <h1
              className="sv-rise font-display mt-6 text-4xl font-semibold leading-[1.05] sm:text-5xl"
              style={{ ["--i" as string]: 1 }}
            >
              Planos para o tamanho da sua agenda.
            </h1>
            <p
              className="sv-rise mt-6 max-w-[48ch] text-lg leading-relaxed text-[var(--sv-cream)]/80"
              style={{ ["--i" as string]: 2 }}
            >
              Escolha o plano do seu negócio e comece a agendar hoje mesmo.
            </p>

            <div
              className="sv-rise mt-9 inline-flex items-center gap-1 rounded-full border border-[var(--sv-night-line)] bg-[rgb(255_240_210/0.05)] p-1"
              style={{ ["--i" as string]: 3 }}
              role="group"
              aria-label="Ciclo de cobrança"
            >
              {(
                [
                  ["YEARLY", "Pago anualmente"],
                  ["MONTHLY", "Pago mensalmente"],
                ] as const
              ).map(([cycle, label]) => (
                <button
                  key={cycle}
                  type="button"
                  onClick={() => setBillingCycle(cycle)}
                  aria-pressed={billingCycle === cycle}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300 active:scale-95 ${
                    billingCycle === cycle
                      ? "bg-[var(--sv-gold-soft)] text-[#1f170d]"
                      : "text-[var(--sv-cream)]/80 hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="sv-rise hidden lg:block" style={{ ["--i" as string]: 2 }}>
            <div className="sv-laptop">
              <div className="sv-laptop-screen">
                <Image
                  src="/marketing/servicos/agenda.webp"
                  alt="Agenda do dia do AlePejo Serviços"
                  width={1600}
                  height={643}
                  priority
                  sizes="40vw"
                  className="sv-shot"
                />
              </div>
              <div className="sv-laptop-base" aria-hidden />
            </div>
          </div>
        </div>
      </section>

      {/* Planos */}
      <Reveal as="section" className="bg-[var(--mkt-bg)] py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-14 max-w-2xl">
            <p className="sv-eyebrow sv-eyebrow-light">Nossos planos</p>
            <h2 className="font-display mt-5 text-3xl font-semibold leading-tight text-[var(--mkt-ink)] sm:text-4xl">
              {trialDays
                ? `Todos os planos começam com ${trialDays} dias de teste grátis.`
                : "Escolha o plano que se encaixa no seu negócio."}
            </h2>
          </div>

          {!plans ? (
            <div className="grid gap-6 md:grid-cols-3" aria-busy="true" aria-label="Carregando planos">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="sv-skel h-80 rounded-3xl" />
              ))}
            </div>
          ) : plans.length === 0 ? (
            <div className="mkt-panel max-w-md p-8">
              <p className="text-[var(--mkt-muted)]">
                Estamos fechando os planos. Fale com a gente pra saber o que já está disponível.
              </p>
              <Link href="/servicos#contato" className="sv-btn sv-btn-ink mt-6">
                Falar com consultor
                <ArrowRight size={17} aria-hidden />
              </Link>
            </div>
          ) : (
            <div className="grid items-stretch gap-6 md:grid-cols-3">
              {plans.map((plan) => {
                const monthly = num(plan.monthlyPrice);
                const yearly = num(plan.yearlyPrice);
                const displayPrice = billingCycle === "YEARLY" && yearly > 0 ? yearly / 12 : monthly;

                return (
                  <div
                    key={plan.id}
                    className={`sv-plan relative flex flex-col rounded-3xl border p-8 ${
                      plan.highlighted
                        ? "border-[var(--sv-gold)]/50 bg-[var(--sv-night)] text-[var(--sv-cream)] shadow-[0_30px_60px_-30px_rgb(70_45_10/0.7)] md:-translate-y-3"
                        : "border-[var(--mkt-border)] bg-[var(--mkt-surface)] text-[var(--mkt-ink)]"
                    }`}
                  >
                    {plan.highlighted && (
                      <span className="absolute -top-3 left-8 inline-flex items-center gap-1.5 rounded-full bg-[var(--sv-gold-soft)] px-3 py-1 text-xs font-bold text-[#1f170d]">
                        <Star size={12} aria-hidden />
                        Mais popular
                      </span>
                    )}

                    <p className="font-display text-xl font-semibold">{plan.name}</p>
                    {plan.description && (
                      <p
                        className={`mt-2 text-sm leading-relaxed ${
                          plan.highlighted ? "text-[var(--sv-cream)]/75" : "text-[var(--mkt-muted)]"
                        }`}
                      >
                        {plan.description}
                      </p>
                    )}

                    <p className="mt-6">
                      <span className="font-display text-4xl font-semibold [font-variant-numeric:tabular-nums]">
                        {displayPrice > 0 ? money(String(displayPrice)) : "Sob consulta"}
                      </span>
                      {displayPrice > 0 && (
                        <span className={plan.highlighted ? "text-[var(--sv-cream)]/70" : "text-[var(--mkt-muted)]"}>
                          /mês
                        </span>
                      )}
                    </p>
                    {billingCycle === "YEARLY" && yearly > 0 && (
                      <p className={`mt-1 text-sm ${plan.highlighted ? "text-[var(--sv-cream)]/70" : "text-[var(--mkt-muted)]"}`}>
                        cobrado {money(plan.yearlyPrice)}/ano
                      </p>
                    )}

                    <div className="mt-8 flex flex-1 flex-col justify-end gap-2">
                      <Link
                        href={signupUrl(plan.id, billingCycle)}
                        className={`sv-btn justify-center ${
                          plan.highlighted
                            ? "sv-btn-gold"
                            : "border border-[var(--mkt-border)] text-[var(--mkt-ink)] hover:border-[var(--mkt-accent-2)]"
                        }`}
                      >
                        <Check size={16} aria-hidden />
                        {trialDays
                          ? `Começar teste de ${trialDays} dia${trialDays === 1 ? "" : "s"}`
                          : "Começar teste grátis"}
                      </Link>

                      <Link
                        href={checkoutUrl(plan.id, billingCycle)}
                        className={`rounded-lg py-2 text-center text-sm font-semibold hover:underline ${
                          plan.highlighted
                            ? "text-[var(--sv-cream)]/80 hover:text-white"
                            : "text-[var(--mkt-muted)] hover:text-[var(--mkt-ink)]"
                        }`}
                      >
                        Comprar agora
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Reveal>

      {/* Já disponível */}
      <Reveal as="section" className="bg-[var(--mkt-bg-alt)] py-24">
        <div className="mx-auto grid max-w-5xl gap-14 px-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16">
          <div>
            <p className="sv-eyebrow sv-eyebrow-light">Já disponível</p>
            <h2 className="font-display mt-5 text-3xl font-semibold leading-tight text-[var(--mkt-ink)] sm:text-4xl">
              Já dá pra usar hoje.
            </h2>
            <p className="mt-4 leading-relaxed text-[var(--mkt-muted)]">
              Essas funcionalidades já estão funcionando e podem ser usadas agora mesmo.
            </p>
          </div>

          <ul className="divide-y divide-[var(--mkt-border)] border-y border-[var(--mkt-border)]">
            {AVAILABLE_NOW.map((item) => (
              <li key={item.title} className="sv-benefit grid grid-cols-[auto_1fr] gap-x-5 py-6">
                <span className="mt-0.5 flex size-11 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--mkt-accent-2)_16%,transparent)] text-[var(--mkt-accent)]">
                  <item.icon size={20} strokeWidth={1.75} aria-hidden />
                </span>
                <div>
                  <h3 className="font-display text-xl font-semibold text-[var(--mkt-ink)]">{item.title}</h3>
                  <p className="mt-1.5 leading-relaxed text-[var(--mkt-muted)]">{item.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </Reveal>

      <section className="bg-[var(--mkt-bg)] py-10">
        <div className="mx-auto max-w-5xl px-6">
          <Link
            href="/servicos"
            className="inline-flex items-center gap-2 text-sm font-medium text-[var(--mkt-muted)] transition-colors hover:text-[var(--mkt-accent)]"
          >
            <ArrowLeft size={16} aria-hidden />
            Voltar para o AlePejo Serviços
          </Link>
        </div>
      </section>

      <ContactSection
        title="Fale sobre os planos"
        description="Conta pra gente o que seu negócio precisa — avaliamos o plano ideal com você."
      />

      <MarketingFooter page="servicos-planos" />
    </div>
  );
}
