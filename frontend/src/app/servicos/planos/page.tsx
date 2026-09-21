"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  CheckCircle2,
  Gift,
  LinkIcon,
  Lock,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";

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

const STATS = [
  { value: "50K+", label: "Negócios ativos", icon: TrendingUp },
  { value: "2M+", label: "Agendamentos", icon: CheckCircle2 },
  { value: "95%", label: "Satisfação", icon: Users },
];

export default function ServicosPlanosPage() {
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
              Planos chegando em breve
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
            Estamos fechando o preço certo para o seu negócio. Em breve você escolhe o
            plano ideal aqui mesmo.
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

      {/* Coming Soon Section */}
      <Reveal as="section" className="py-24 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
        <div className="mx-auto max-w-4xl px-6">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <span className="inline-flex items-center gap-2 rounded-full border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/30 px-4 py-2 mb-4">
              <Lock size={16} className="text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                Em breve
              </span>
            </span>
            <h2 className="font-display text-4xl font-bold text-slate-900 dark:text-white">
              Planos personalizados
            </h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
              Estamos trabalhando em planos que se encaixam perfeitamente no seu orçamento
            </p>
          </div>

          <div className="glass-card rounded-3xl p-8 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700">
            <div className="flex flex-col items-center text-center gap-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-xl">
                <Sparkles size={36} />
              </div>

              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                  Quer ser avisado?
                </p>
                <p className="text-slate-600 dark:text-slate-400">
                  Entre em contato e te avisamos assim que os planos estiverem disponíveis
                </p>
              </div>

              <Link
                href="/servicos#contato"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-4 text-sm font-semibold text-white shadow-xl shadow-purple-500/30 transition-all hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/50"
              >
                Falar com consultor
                <ArrowRight size={18} />
              </Link>
            </div>
          </div>
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
