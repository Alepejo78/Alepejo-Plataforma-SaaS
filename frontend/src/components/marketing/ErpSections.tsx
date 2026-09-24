"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Boxes,
  Cpu,
  Database,
  Factory,
  Globe,
  KeyRound,
  MessageCircle,
  Rocket,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Store,
  Truck,
  Users,
} from "lucide-react";

import { Reveal } from "./Reveal";
import { ProductShowcase, type Slide } from "./ServicosShowcase";
import { ServicosTilt } from "./ServicosTilt";

const ERP_SLIDES: Slide[] = [
  {
    id: "dashboard",
    tab: "Dashboard",
    description: "Indicadores e gráficos da equipe: função, setor e perfil dos colaboradores.",
    src: "/marketing/erp/dashboard.webp",
    width: 1600,
    height: 756,
    alt: "Dashboard do AlePejo ERP com gráficos de colaboradores por função, setor e sexo",
    highlights: [{ label: "Indicadores da empresa", x: 17, y: 27, w: 80, h: 11 }],
  },
  {
    id: "compras",
    tab: "Compras",
    description: "Cotações, pedidos e recebimento. O recebimento atualiza o estoque.",
    src: "/marketing/erp/compras.webp",
    width: 1600,
    height: 750,
    alt: "Lista de compras com fornecedor, depósito, total e situação",
    highlights: [{ label: "Do pedido ao recebimento", x: 18, y: 35, w: 80, h: 13 }],
  },
  {
    id: "vendas",
    tab: "Vendas",
    description: "Vendas e baixa de estoque na aprovação, com orçamentos, pedidos e ordens de serviço.",
    src: "/marketing/erp/vendas.webp",
    width: 1600,
    height: 753,
    alt: "Lista de vendas com cliente, depósito, valores e situação",
    highlights: [{ label: "Baixa de estoque na aprovação", x: 18, y: 36, w: 80, h: 11 }],
  },
  {
    id: "estoque",
    tab: "Estoque",
    description: "Histórico de entradas, saídas e ajustes, por produto e depósito.",
    src: "/marketing/erp/estoque.webp",
    width: 1600,
    height: 750,
    alt: "Movimentações de estoque com entradas e saídas por produto e depósito",
    highlights: [{ label: "Entradas e saídas", x: 18, y: 44, w: 80, h: 17 }],
  },
  {
    id: "receber",
    tab: "Financeiro",
    description: "Títulos a receber com vencimento, forma de pagamento e situação.",
    src: "/marketing/erp/receber.webp",
    width: 1600,
    height: 757,
    alt: "Contas a receber com vencimento, cliente, valor e situação",
    highlights: [{ label: "Situação de cada título", x: 18, y: 36, w: 80, h: 24 }],
  },
  {
    id: "orcamento",
    tab: "Orçamento",
    description: "Planejado x realizado mês a mês, com receitas, despesas e resultado.",
    src: "/marketing/erp/orcamento.webp",
    width: 1600,
    height: 753,
    alt: "Orçamento anual com receita e despesa orçadas e realizadas por mês",
    highlights: [{ label: "Planejado x realizado", x: 18, y: 28, w: 80, h: 32 }],
  },
  {
    id: "producao",
    tab: "Produção",
    description: "Ordens de produção com origem, prazo e situação.",
    src: "/marketing/erp/producao.webp",
    width: 1600,
    height: 749,
    alt: "Ordens de produção com produto, depósito, origem, previsão e situação",
    highlights: [{ label: "Prazo e situação", x: 16, y: 35, w: 82, h: 11 }],
  },
  {
    id: "rh",
    tab: "RH",
    description: "Indicadores de colaboradores por função e setor.",
    src: "/marketing/erp/rh.webp",
    width: 1600,
    height: 757,
    alt: "Indicadores de RH com colaboradores ativos e média salarial por função e setor",
    highlights: [{ label: "Colaboradores ativos", x: 18, y: 34, w: 78, h: 12 }],
  },
];

export function ErpShowcase() {
  return (
    <Reveal as="section" className="bg-[var(--surface)] py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-14 max-w-2xl">
          <p className="erp-eyebrow erp-eyebrow-light">O sistema em uso</p>
          <h2 className="font-display mt-5 text-3xl font-semibold leading-tight text-[var(--text-primary)] sm:text-4xl">
            Cada módulo, do jeito que a equipe usa.
          </h2>
        </div>
        <ProductShowcase slides={ERP_SLIDES} stageAspect={2.12} />
      </div>
    </Reveal>
  );
}

export function ErpHero({ trialDays }: { trialDays: number }) {
  return (
    <section className="erp-hero">
      <div className="mx-auto grid max-w-7xl gap-14 px-6 pb-20 pt-16 lg:min-h-[calc(100dvh-4.5rem)] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center lg:gap-10 lg:py-20">
        <div className="max-w-xl">
          <p className="erp-rise erp-eyebrow" style={{ ["--i" as string]: 0 }}>
            AlePejo ERP Cloud
          </p>
          <h1
            className="erp-rise font-display mt-6 text-4xl font-semibold leading-[1.05] sm:text-5xl lg:text-[3.3rem]"
            style={{ ["--i" as string]: 1 }}
          >
            Toda a operação da empresa, num só lugar e sob controle.
          </h1>
          <p
            className="erp-rise mt-6 max-w-[52ch] text-lg leading-relaxed text-[var(--erp-ice)]/80"
            style={{ ["--i" as string]: 2 }}
          >
            Vendas, compras, estoque, financeiro, RH e produção integrados num ERP na nuvem, com permissões por perfil
            e os dados de cada empresa separados dos demais.
          </p>

          <div className="erp-rise mt-9 flex flex-wrap items-center gap-3" style={{ ["--i" as string]: 3 }}>
            <Link href="/cadastro-empresa" className="erp-btn erp-btn-primary">
              Começar grátis
              <ArrowRight size={17} aria-hidden />
            </Link>
            <Link href="/comercial" className="erp-btn erp-btn-ghost">
              Ver planos
            </Link>
          </div>

          <ul
            className="erp-rise mt-10 flex flex-wrap gap-x-6 gap-y-2 border-t border-[var(--erp-line)] pt-6 text-sm text-[var(--erp-ice)]/75"
            style={{ ["--i" as string]: 4 }}
          >
            {[`${trialDays} dias grátis`, "Sem cartão de crédito", "Permissões por perfil"].map((point) => (
              <li key={point} className="flex items-center gap-2">
                <span aria-hidden className="size-1.5 rounded-full bg-[var(--erp-blue)]" />
                {point}
              </li>
            ))}
          </ul>
        </div>

        <ServicosTilt className="erp-rise relative">
          <div className="erp-window">
            <div className="sv-laptop-screen">
              <Image
                src="/marketing/erp/dashboard.webp"
                alt="Dashboard do AlePejo ERP com gráficos de colaboradores por função, setor e sexo"
                width={1600}
                height={756}
                priority
                sizes="(min-width: 1024px) 58vw, 100vw"
                className="sv-shot"
              />
            </div>
            <div className="sv-laptop-base" aria-hidden />
          </div>
          <p className="mt-4 text-xs text-[var(--erp-ice)]/60">
            Captura do sistema real, com dados fictícios de demonstração.
          </p>
        </ServicosTilt>
      </div>
    </section>
  );
}

const VALUE_PROPS = [
  {
    icon: Boxes,
    title: "Módulos que conversam entre si",
    text: "Uma venda dá baixa no estoque e já gera o título financeiro. Vendas, compras, estoque, financeiro, RH e produção usam os mesmos cadastros.",
  },
  {
    icon: Rocket,
    title: "Comece sem infraestrutura",
    text: "Cadastre a empresa e teste o sistema na nuvem, sem servidor próprio nem equipe de TI dedicada.",
  },
  {
    icon: Smartphone,
    title: "No computador, tablet ou celular",
    text: "O sistema roda no navegador, então a equipe acessa de onde estiver.",
  },
  {
    icon: ShieldCheck,
    title: "Cada empresa enxerga só os próprios dados",
    text: "Os dados são separados por empresa e o acesso é controlado por perfil de usuário.",
  },
];

export function ErpValueProps() {
  return (
    <Reveal as="section" id="implantacao" className="bg-[var(--background)] py-24">
      <div className="mx-auto grid max-w-7xl gap-14 px-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="erp-eyebrow erp-eyebrow-light">Por que o AlePejo ERP</p>
          <h2 className="font-display mt-5 text-3xl font-semibold leading-tight text-[var(--text-primary)] sm:text-4xl">
            Organização e clareza para decidir com os dados em mãos.
          </h2>
        </div>

        <ol className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
          {VALUE_PROPS.map((prop, index) => (
            <li key={prop.title} className="erp-row grid grid-cols-[auto_1fr] gap-x-6 py-7">
              <span className="font-display tnum text-3xl font-semibold text-[var(--primary)]/70">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="flex items-center gap-2.5 font-display text-xl font-semibold text-[var(--text-primary)]">
                  <prop.icon size={18} strokeWidth={1.75} className="text-[var(--primary)]" aria-hidden />
                  {prop.title}
                </h3>
                <p className="mt-2 max-w-[60ch] leading-relaxed text-[var(--text-muted)]">{prop.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </Reveal>
  );
}

const SEGMENTS = [
  { icon: Factory, label: "Indústria" },
  { icon: Store, label: "Comércio" },
  { icon: Cpu, label: "Tecnologia" },
  { icon: Truck, label: "Logística" },
  { icon: Sparkles, label: "Serviços" },
  { icon: Globe, label: "Internacional" },
];

export function ErpAudience() {
  return (
    <Reveal as="section" className="erp-navy py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-14 max-w-2xl">
          <p className="erp-eyebrow">Segmentos</p>
          <h2 className="font-display mt-5 text-3xl font-semibold leading-tight sm:text-4xl">
            Indústria, comércio, serviços, tecnologia e mais.
          </h2>
        </div>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {SEGMENTS.map((segment) => (
            <li
              key={segment.label}
              className="erp-glass erp-chip flex flex-col gap-4 rounded-2xl p-5 hover:!bg-[rgb(70_120_240/0.18)]"
            >
              <segment.icon size={24} strokeWidth={1.5} className="text-[var(--erp-blue)]" aria-hidden />
              <span className="text-sm font-semibold">{segment.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </Reveal>
  );
}

const FEATURES = [
  {
    icon: BarChart3,
    title: "Dashboard",
    text: "Visão geral do negócio com gráficos e indicadores.",
  },
  {
    icon: Users,
    title: "Gestão de metas",
    text: "Defina objetivos e acompanhe o progresso com alertas automáticos.",
  },
  {
    icon: Database,
    title: "Relatórios",
    text: "Relatórios para cada área da empresa.",
  },
  {
    icon: Smartphone,
    title: "App mobile",
    text: "Acesso pelo celular com o aplicativo dedicado.",
  },
  {
    icon: MessageCircle,
    title: "Integração com WhatsApp",
    text: "Notificações e lembretes enviados automaticamente por WhatsApp.",
  },
  {
    icon: KeyRound,
    title: "Controle de acesso",
    text: "Permissões e perfis de usuário para cada pessoa da equipe.",
  },
];

export function ErpFeatures() {
  return (
    <Reveal as="section" id="funcionalidades" className="bg-[var(--surface)] py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-14 grid gap-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16">
          <div>
            <p className="erp-eyebrow erp-eyebrow-light">Funcionalidades</p>
            <h2 className="font-display mt-5 text-3xl font-semibold leading-tight text-[var(--text-primary)] sm:text-4xl">
              O que você usa no dia a dia.
            </h2>
          </div>
        </div>

        <ul className="grid gap-x-16 divide-y divide-[var(--border)] border-y border-[var(--border)] md:grid-cols-2 md:divide-y-0">
          {FEATURES.map((feature, index) => (
            <li
              key={feature.title}
              className={`erp-row flex gap-5 py-6 ${index >= 2 ? "md:border-t md:border-[var(--border)]" : ""}`}
            >
              <span className="mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary-text)]">
                <feature.icon size={20} strokeWidth={1.75} aria-hidden />
              </span>
              <div>
                <h3 className="font-display text-lg font-semibold text-[var(--text-primary)]">{feature.title}</h3>
                <p className="mt-1 max-w-[46ch] leading-relaxed text-[var(--text-muted)]">{feature.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Reveal>
  );
}
