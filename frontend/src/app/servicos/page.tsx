"use client";

import { useState } from "react";
import Link from "next/link";
import type { CSSProperties } from "react";
import {
  ArrowRight,
  Bell,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Gift,
  MessageCircle,
  PawPrint,
  Scissors,
  Smartphone,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";

import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { ContactSection } from "@/components/marketing/ContactSection";
import { SegmentIconsBackground } from "@/components/marketing/SegmentIconsBackground";
import { SERVICE_SEGMENTS } from "@/components/marketing/segments-data";
import { marketingFontVars } from "@/components/marketing/fonts";
import { Reveal } from "@/components/marketing/Reveal";
import { ServicosDemoTour } from "@/components/marketing/ServicosDemoTour";
import "@/components/marketing/vibrant.css";
import "@/components/marketing/marketing-shared.css";

const NAV_LINKS = [
  { label: "Recursos", href: "/servicos#recursos" },
  { label: "Segmentos", href: "/servicos#segmentos" },
  { label: "Contato", href: "/servicos#contato" },
];

const STATS = [
  { value: "50K+", label: "Negócios", icon: TrendingUp },
  { value: "2M+", label: "Agendamentos", icon: CalendarCheck },
  { value: "95%", label: "Confirmação", icon: CheckCircle2 },
  { value: "24/7", label: "Disponível", icon: Clock },
];

const HERO_CARDS = [
  {
    icon: Scissors,
    title: "Barbearia",
    time: "14:00",
    service: "Corte + Barba",
    color: "from-blue-500 to-cyan-500",
    delay: "0",
  },
  {
    icon: Sparkles,
    title: "Salão",
    time: "10:30",
    service: "Escova",
    color: "from-purple-500 to-pink-500",
    delay: "200",
  },
  {
    icon: PawPrint,
    title: "Petshop",
    time: "16:15",
    service: "Banho e Tosa",
    color: "from-green-500 to-emerald-500",
    delay: "400",
  },
];

const FEATURES = [
  {
    icon: CalendarCheck,
    title: "Link de agendamento próprio",
    description:
      "Seu cliente escolhe serviço, profissional e horário sozinho, num link com a cara do seu negócio — sem grupo de WhatsApp lotado nem caderninho.",
    stat: "+80% agendamentos",
  },
  {
    icon: Bell,
    title: "Lembretes automáticos",
    description: "Confirmação e lembrete por WhatsApp — menos falta, mais agenda cheia.",
    stat: "-60% no-show",
  },
  {
    icon: Gift,
    title: "Fidelidade",
    description: "Pontos por atendimento e resgate configurável pra trazer o cliente de volta.",
    stat: "3x mais retorno",
  },
  {
    icon: MessageCircle,
    title: "Histórico do cliente",
    description: "Cadastro e histórico de atendimentos guardados — inclusive carteira de vacina pra petshops.",
    stat: "100% integrado",
  },
  {
    icon: Smartphone,
    title: "App do profissional",
    description:
      "Pelo celular, cada profissional acompanha a própria agenda e o faturamento — sem precisar abrir o sistema completo.",
    stat: "Mobile-first",
  },
  {
    icon: Users,
    title: "Gestão de equipe",
    description:
      "Controle completa da sua equipe, horários, disponibilidade e comissionamento em um só lugar.",
    stat: "Equipe unificada",
  },
];

const TESTIMONIALS = [
  {
    name: "Maria Silva",
    role: "Barbearia",
    content: "Aumentei meus agendamentos em 200% no primeiro mês. Meus clientes adoram poder marcar sozinhos.",
    avatar: "MS",
  },
  {
    name: "João Santos",
    role: "Salão",
    content: "O sistema de lembretes praticamente eliminou as faltas. Minha agenda nunca esteve tão cheia.",
    avatar: "JS",
  },
  {
    name: "Ana Costa",
    role: "Petshop",
    content: "A carteira de vacina integrada facilitou muito a vida. Tudo organizado em um só lugar.",
    avatar: "AC",
  },
];

export default function ServicosPage() {
  const [activeCard, setActiveCard] = useState<number | null>(null);

  return (
    <div className={`${marketingFontVars} marketing-page theme-vibrant`}>
      <MarketingNav
        links={NAV_LINKS}
        ctaLabel="Ver planos"
        ctaHref="/servicos/planos"
      />

      {/* Hero Section */}
      <section className="relative z-0 overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(135deg,rgba(59,130,246,0.1),rgba(147,51,234,0.1),rgba(236,72,153,0.1))]" />
        <div aria-hidden className="mkt-dotgrid pointer-events-none absolute inset-0 opacity-20" />
        <SegmentIconsBackground />

        <div className="relative mx-auto max-w-7xl px-6 py-24 lg:py-32">
          <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
            {/* Content */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/30 px-4 py-2">
                <Sparkles size={16} className="text-purple-600 dark:text-purple-400" />
                <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                  Plataforma #1 de agendamento
                </span>
              </div>

              <h1 className="font-display text-5xl font-bold leading-tight text-slate-900 dark:text-white sm:text-6xl lg:text-7xl">
                Agendamento
                <br />
                <span className="bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 bg-clip-text text-transparent">
                  inteligente
                </span>
                <br />
                para seu negócio
              </h1>

              <p className="max-w-2xl text-xl text-slate-600 dark:text-slate-300 leading-relaxed">
                Barbearias, salões, clínicas, petshops e outros negócios de atendimento:
                automatize sua agenda, encante seus clientes e cresça seus resultados.
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <Link
                  href="/servicos/planos"
                  className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-4 text-sm font-semibold text-white shadow-xl shadow-purple-500/30 transition-all hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/50"
                >
                  Começar agora
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link
                  href="/servicos#contato"
                  className="inline-flex items-center gap-2 rounded-full border-2 border-slate-200 dark:border-slate-700 px-8 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200 transition-all hover:border-purple-500 hover:text-purple-600"
                >
                  Falar com consultor
                </Link>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-6 pt-8">
                {STATS.map((stat) => (
                  <div key={stat.label} className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg">
                      <stat.icon size={20} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">
                        {stat.value}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{stat.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cards */}
            <div className="relative h-[500px]">
              {HERO_CARDS.map((card, index) => (
                <div
                  key={card.title}
                  className="absolute transition-all duration-500 hover:scale-105"
                  style={{
                    top: `${index * 25}%`,
                    left: index === 0 ? "0%" : index === 1 ? "30%" : "60%",
                    width: "45%",
                    zIndex: 3 - index,
                  }}
                >
                  <div
                    className="glass-card rounded-3xl p-6 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/20 dark:border-slate-700/20 shadow-2xl"
                    onMouseEnter={() => setActiveCard(index)}
                    onMouseLeave={() => setActiveCard(null)}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${card.color} text-white shadow-lg`}
                      >
                        <card.icon size={24} />
                      </div>
                      <div>
                        <p className="font-display text-lg font-bold text-slate-900 dark:text-white">
                          {card.title}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {card.time} · {card.service}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2 text-sm font-medium text-purple-600 dark:text-purple-400">
                        <CheckCircle2 size={16} />
                        <span>Confirmado no WhatsApp</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Demo Tour Section */}
      <Reveal as="section" className="py-24 bg-white dark:bg-slate-900">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-3xl text-center mb-16">
            <span className="inline-flex items-center gap-2 rounded-full border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/30 px-4 py-2 mb-4">
              <Sparkles size={16} className="text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                Demonstração interativa
              </span>
            </span>
            <h2 className="font-display text-4xl font-bold text-slate-900 dark:text-white">
              Veja como funciona na prática
            </h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
              Explore o sistema completo, o link público e o app do profissional
            </p>
          </div>

          <div className="mt-12">
            <ServicosDemoTour />
          </div>
        </div>
      </Reveal>

      {/* Features Section */}
      <Reveal as="section" id="recursos" className="py-24 bg-white dark:bg-slate-900">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-3xl text-center mb-16">
            <span className="inline-flex items-center gap-2 rounded-full border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/30 px-4 py-2 mb-4">
              <Zap size={16} className="text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                Recursos poderosos
              </span>
            </span>
            <h2 className="font-display text-4xl font-bold text-slate-900 dark:text-white">
              Tudo que sua agenda precisa
            </h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
              Ferramentas completas para transformar seu negócio de atendimento
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature, index) => (
              <div
                key={feature.title}
                className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 p-8 border border-slate-200 dark:border-slate-700 transition-all hover:shadow-2xl hover:scale-[1.02]"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full blur-3xl group-hover:scale-150 transition-transform" />

                <div className="relative">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-xl group-hover:scale-110 transition-transform">
                    <feature.icon size={28} />
                  </div>

                  <p className="font-display mt-6 text-xl font-bold text-slate-900 dark:text-white">
                    {feature.title}
                  </p>
                  <p className="mt-3 text-base text-slate-600 dark:text-slate-400 leading-relaxed">
                    {feature.description}
                  </p>

                  <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-purple-600 dark:text-purple-400">
                    <TrendingUp size={16} />
                    <span>{feature.stat}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      {/* Segmentos Section */}
      <Reveal as="section" id="segmentos" className="py-24 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-3xl text-center mb-16">
            <span className="inline-flex items-center gap-2 rounded-full border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/30 px-4 py-2 mb-4">
              <Sparkles size={16} className="text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                Multi-segmento
              </span>
            </span>
            <h2 className="font-display text-4xl font-bold text-slate-900 dark:text-white">
              Feito para o seu segmento
            </h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
              Cada segmento tem sua própria linguagem e customização — do vocabulário do
              link público à carteira de vacina do pet.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
            {SERVICE_SEGMENTS.map((segment, index) => (
              <div
                key={segment.label}
                className="group relative overflow-hidden rounded-3xl bg-white dark:bg-slate-800 p-6 border border-slate-200 dark:border-slate-700 transition-all hover:shadow-xl hover:scale-105"
                style={{ transform: index % 2 === 1 ? "translateY(20px)" : undefined }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="relative">
                  <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-lg group-hover:scale-110 transition-transform">
                    <segment.icon size={28} />
                  </span>
                  <p className="mt-4 text-base font-semibold text-slate-900 dark:text-white">
                    {segment.label}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      {/* Testimonials Section */}
      <Reveal as="section" className="py-24 bg-white dark:bg-slate-900">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-3xl text-center mb-16">
            <span className="inline-flex items-center gap-2 rounded-full border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/30 px-4 py-2 mb-4">
              <Users size={16} className="text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                Depoimentos
              </span>
            </span>
            <h2 className="font-display text-4xl font-bold text-slate-900 dark:text-white">
              O que nossos clientes dizem
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {TESTIMONIALS.map((testimonial) => (
              <div
                key={testimonial.name}
                className="glass-card rounded-3xl p-8 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-pink-600 text-white text-xl font-bold">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {testimonial.name}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {testimonial.role}
                    </p>
                  </div>
                </div>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  "{testimonial.content}"
                </p>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 text-center">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="font-display text-4xl font-bold text-white mb-6">
            Pronto para transformar sua agenda?
          </h2>

          <p className="text-xl text-white/90 mb-10">
            Junte-se a milhares de negócios que já revolucionaram seus agendamentos
          </p>

          <Link
            href="/servicos/planos"
            className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-sm font-semibold text-purple-600 shadow-xl transition-all hover:scale-105 hover:shadow-2xl"
          >
            Ver planos e preços
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <ContactSection
        title="Fale sobre o AlePejo Serviços"
        description="Quer saber se o Serviços atende o seu segmento? Manda uma mensagem."
      />

      <MarketingFooter page="servicos" />

      <style jsx>{`
        .glass-card {
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }
      `}</style>
    </div>
  );
}
