"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Check,
  CheckCircle2,
  Gift,
  LinkIcon,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";

import { getServicosPublicPlans, type ServicosPlan } from "@/services/servicos-planos.service";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { ContactSection } from "@/components/marketing/ContactSection";
import { marketingFontVars } from "@/components/marketing/fonts";
import { Reveal } from "@/components/marketing/Reveal";
import "@/components/marketing/vibrant.css";
import "@/components/marketing/marketing-shared.css";

function money(value: string | null) {
  if (value == null) return null;
  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
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

const STATS = [
  { value: "50K+", label: "Negócios ativos", icon: TrendingUp },
  { value: "2M+", label: "Agendamentos", icon: CheckCircle2 },
  { value: "95%", label: "Satisfação", icon: Users },
];

export default function ServicosPlanosPage() {
  const [plans, setPlans] = useState<ServicosPlan[] | null>(null);
  const [trialDays, setTrialDays] = useState<number | null>(null);

  useEffect(() => {
    getServicosPublicPlans()
      .then((res) => {
        setPlans(res.plans);
        setTrialDays(res.trialDays);
      })
      .catch(() => setPlans([]));
  }, []);

  return (
    <div className={`${marketingFontVars} marketing-page theme-vibrant`}>
      <MarketingNav links={NAV_LINKS} />

      {/* Hero Section */}
      <section className="relative z-0 overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(135deg,rgba(59,130,246,0.1),rgba(147,51,234,0.1),rgba(236,72,153,0.1))]" />
        <div aria-hidden className="mkt-dotgrid pointer-events-none absolute inset-0 opacity-20" />

        <Reveal className="relative mx-auto max-w-4xl px-6 py-24 lg:py-32 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/30 px-4 py-2 mb-6">
            <Sparkles size={16} className="text-purple-600 dark:text-purple-400" />
            <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">
              {trialDays ? `${trialDays} dias de teste grátis` : "Planos AlePejo Serviços"}
            </span>
          </div>

          <h1 className="font-display text-5xl font-bold leading-tight text-slate-900 dark:text-white sm:text-6xl lg:text-7xl">
            Planos para cada
            <br />
            <span className="bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 bg-clip-text text-transparent">
              tamanho de agenda
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-xl text-slate-600 dark:text-slate-300 leading-relaxed">
            Escolha o plano ideal pro seu negócio e comece a agendar hoje mesmo.
          </p>

          {/* Stats */}
          <div className="mx-auto mt-12 grid grid-cols-3 gap-6 max-w-2xl">
            {STATS.map((stat) => (
              <div key={stat.label} className="flex flex-col items-center gap-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg">
                  <stat.icon size={20} />
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {stat.value}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* Available Now Section */}
      <Reveal as="section" className="py-24 bg-white dark:bg-slate-900">
        <div className="mx-auto max-w-4xl px-6">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <span className="inline-flex items-center gap-2 rounded-full border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/30 px-4 py-2 mb-4">
              <Zap size={16} className="text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                Já disponível
              </span>
            </span>
            <h2 className="font-display text-4xl font-bold text-slate-900 dark:text-white">
              Já dá pra usar hoje
            </h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
              Essas funcionalidades já estão funcionando e podem ser usadas agora mesmo
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {AVAILABLE_NOW.map((item) => (
              <div
                key={item.title}
                className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 p-8 border border-slate-200 dark:border-slate-700 transition-all hover:shadow-2xl hover:scale-[1.02]"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full blur-3xl group-hover:scale-150 transition-transform" />

                <div className="relative">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-xl group-hover:scale-110 transition-transform">
                    <item.icon size={28} />
                  </div>

                  <p className="font-display mt-6 text-xl font-bold text-slate-900 dark:text-white">
                    {item.title}
                  </p>
                  <p className="mt-3 text-base text-slate-600 dark:text-slate-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      {/* Plans Section */}
      <Reveal as="section" className="py-24 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="font-display text-4xl font-bold text-slate-900 dark:text-white">
              Nossos planos
            </h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
              {trialDays
                ? `Todos os planos começam com ${trialDays} dias de teste grátis.`
                : "Escolha o plano que se encaixa no seu negócio."}
            </p>
          </div>

          {!plans ? (
            <p className="text-center text-slate-500 dark:text-slate-400">Carregando planos…</p>
          ) : plans.length === 0 ? (
            <div className="glass-card mx-auto max-w-md rounded-3xl p-8 text-center bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700">
              <p className="text-slate-600 dark:text-slate-400">
                Estamos fechando os planos. Fale com a gente pra saber o que já está disponível.
              </p>
              <Link
                href="/servicos#contato"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-4 text-sm font-semibold text-white shadow-xl shadow-purple-500/30 transition-all hover:scale-105"
              >
                Falar com consultor
                <ArrowRight size={18} />
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-3">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`relative rounded-3xl border p-8 ${
                    plan.highlighted
                      ? "border-purple-400 bg-white shadow-2xl shadow-purple-500/20 dark:border-purple-500 dark:bg-slate-800 md:scale-105"
                      : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                  }`}
                >
                  {plan.highlighted && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-1 text-xs font-semibold text-white">
                      Mais popular
                    </span>
                  )}

                  <p className="font-display text-xl font-bold text-slate-900 dark:text-white">
                    {plan.name}
                  </p>
                  {plan.description && (
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                      {plan.description}
                    </p>
                  )}

                  <p className="mt-6">
                    <span className="text-4xl font-bold text-slate-900 dark:text-white">
                      {money(plan.monthlyPrice) ?? "Sob consulta"}
                    </span>
                    {plan.monthlyPrice && (
                      <span className="text-slate-500 dark:text-slate-400">/mês</span>
                    )}
                  </p>
                  {plan.yearlyPrice && (
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      ou {money(plan.yearlyPrice)}/ano
                    </p>
                  )}

                  <Link
                    href="/servicos#contato"
                    className={`mt-8 flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-all hover:scale-105 ${
                      plan.highlighted
                        ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30"
                        : "border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                    }`}
                  >
                    <Check size={16} />
                    Começar agora
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </Reveal>

      {/* Back Button */}
      <section className="py-12 bg-white dark:bg-slate-900">
        <div className="mx-auto max-w-4xl px-6">
          <Link
            href="/servicos"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
          >
            <ArrowLeft size={16} />
            Voltar para o AlePejo Serviços
          </Link>
        </div>
      </section>

      <ContactSection
        title="Fale sobre os planos"
        description="Conta pra gente o que seu negócio precisa — avaliamos o plano ideal com você."
      />

      <MarketingFooter page="servicos-planos" />

      <style jsx>{`
        .glass-card {
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }
      `}</style>
    </div>
  );
}
