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
import { useTranslations } from "@/lib/i18n/useTranslations";
import { erpSectionsDictionary } from "@/lib/i18n/dictionaries/erpSections";

export function ErpShowcase() {
  const { t } = useTranslations(erpSectionsDictionary);

  const ERP_SLIDES: Slide[] = [
    {
      id: "dashboard",
      tab: "Dashboard",
      description: t("showcase.slideDashboard"),
      src: "/marketing/erp/dashboard.webp",
      width: 1600,
      height: 756,
      alt: "Dashboard do AlePejo ERP com gráficos de colaboradores por função, setor e sexo",
      highlights: [{ label: t("showcase.highlightIndicadores"), x: 17, y: 27, w: 80, h: 11 }],
    },
    {
      id: "compras",
      tab: "Compras",
      description: t("showcase.slideCompras"),
      src: "/marketing/erp/compras.webp",
      width: 1600,
      height: 750,
      alt: "Lista de compras com fornecedor, depósito, total e situação",
      highlights: [{ label: t("showcase.highlightCompras"), x: 18, y: 35, w: 80, h: 13 }],
    },
    {
      id: "vendas",
      tab: "Vendas",
      description: t("showcase.slideVendas"),
      src: "/marketing/erp/vendas.webp",
      width: 1600,
      height: 753,
      alt: "Lista de vendas com cliente, depósito, valores e situação",
      highlights: [{ label: t("showcase.highlightVendas"), x: 18, y: 36, w: 80, h: 11 }],
    },
    {
      id: "estoque",
      tab: "Estoque",
      description: t("showcase.slideEstoque"),
      src: "/marketing/erp/estoque.webp",
      width: 1600,
      height: 750,
      alt: "Movimentações de estoque com entradas e saídas por produto e depósito",
      highlights: [{ label: t("showcase.highlightEstoque"), x: 18, y: 44, w: 80, h: 17 }],
    },
    {
      id: "receber",
      tab: "Financeiro",
      description: t("showcase.slideReceber"),
      src: "/marketing/erp/receber.webp",
      width: 1600,
      height: 757,
      alt: "Contas a receber com vencimento, cliente, valor e situação",
      highlights: [{ label: t("showcase.highlightReceber"), x: 18, y: 36, w: 80, h: 24 }],
    },
    {
      id: "orcamento",
      tab: "Orçamento",
      description: t("showcase.slideOrcamento"),
      src: "/marketing/erp/orcamento.webp",
      width: 1600,
      height: 753,
      alt: "Orçamento anual com receita e despesa orçadas e realizadas por mês",
      highlights: [{ label: t("showcase.highlightOrcamento"), x: 18, y: 28, w: 80, h: 32 }],
    },
    {
      id: "producao",
      tab: "Produção",
      description: t("showcase.slideProducao"),
      src: "/marketing/erp/producao.webp",
      width: 1600,
      height: 749,
      alt: "Ordens de produção com produto, depósito, origem, previsão e situação",
      highlights: [{ label: t("showcase.highlightProducao"), x: 16, y: 35, w: 82, h: 11 }],
    },
    {
      id: "rh",
      tab: "RH",
      description: t("showcase.slideRh"),
      src: "/marketing/erp/rh.webp",
      width: 1600,
      height: 757,
      alt: "Indicadores de RH com colaboradores ativos e média salarial por função e setor",
      highlights: [{ label: t("showcase.highlightRh"), x: 18, y: 34, w: 78, h: 12 }],
    },
  ];

  return (
    <Reveal as="section" className="bg-[var(--surface)] py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-14 max-w-2xl">
          <p className="erp-eyebrow erp-eyebrow-light">{t("showcase.eyebrow")}</p>
          <h2 className="font-display mt-5 text-3xl font-semibold leading-tight text-[var(--text-primary)] sm:text-4xl">
            {t("showcase.title")}
          </h2>
        </div>
        <ProductShowcase slides={ERP_SLIDES} stageAspect={2.12} />
      </div>
    </Reveal>
  );
}

export function ErpHero({ trialDays }: { trialDays: number }) {
  const { t } = useTranslations(erpSectionsDictionary);

  return (
    <section className="erp-hero">
      <div className="mx-auto grid max-w-7xl gap-14 px-6 pb-20 pt-16 lg:min-h-[calc(100dvh-4.5rem)] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center lg:gap-10 lg:py-20">
        <div className="max-w-xl">
          <p className="erp-rise erp-eyebrow" style={{ ["--i" as string]: 0 }}>
            {t("hero.eyebrow")}
          </p>
          <h1
            className="erp-rise font-display mt-6 text-4xl font-semibold leading-[1.05] sm:text-5xl lg:text-[3.3rem]"
            style={{ ["--i" as string]: 1 }}
          >
            {t("hero.title")}
          </h1>
          <p
            className="erp-rise mt-6 max-w-[52ch] text-lg leading-relaxed text-[var(--erp-ice)]/80"
            style={{ ["--i" as string]: 2 }}
          >
            {t("hero.subtitle")}
          </p>

          <div className="erp-rise mt-9 flex flex-wrap items-center gap-3" style={{ ["--i" as string]: 3 }}>
            <Link href="/cadastro-empresa" className="erp-btn erp-btn-primary">
              {t("hero.ctaStart")}
              <ArrowRight size={17} aria-hidden />
            </Link>
            <Link href="/comercial" className="erp-btn erp-btn-ghost">
              {t("hero.ctaPlans")}
            </Link>
          </div>

          <ul
            className="erp-rise mt-10 flex flex-wrap gap-x-6 gap-y-2 border-t border-[var(--erp-line)] pt-6 text-sm text-[var(--erp-ice)]/75"
            style={{ ["--i" as string]: 4 }}
          >
            {[t("hero.trialPoint").replace("{days}", String(trialDays)), t("hero.noCard"), t("hero.permissions")].map(
              (point) => (
                <li key={point} className="flex items-center gap-2">
                  <span aria-hidden className="size-1.5 rounded-full bg-[var(--erp-blue)]" />
                  {point}
                </li>
              ),
            )}
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
          <p className="mt-4 text-xs text-[var(--erp-ice)]/60">{t("hero.screenshotNote")}</p>
        </ServicosTilt>
      </div>
    </section>
  );
}

const VALUE_PROP_ICONS = [Boxes, Rocket, Smartphone, ShieldCheck];

export function ErpValueProps() {
  const { t } = useTranslations(erpSectionsDictionary);

  const VALUE_PROPS = VALUE_PROP_ICONS.map((icon, i) => ({
    icon,
    title: t(`valueProps.p${i + 1}Title`),
    text: t(`valueProps.p${i + 1}Text`),
  }));

  return (
    <Reveal as="section" id="implantacao" className="bg-[var(--background)] py-24">
      <div className="mx-auto grid max-w-7xl gap-14 px-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="erp-eyebrow erp-eyebrow-light">{t("valueProps.eyebrow")}</p>
          <h2 className="font-display mt-5 text-3xl font-semibold leading-tight text-[var(--text-primary)] sm:text-4xl">
            {t("valueProps.title")}
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

const AUDIENCE_ICONS_KEYS: [typeof Factory, string][] = [
  [Factory, "industria"],
  [Store, "comercio"],
  [Cpu, "tecnologia"],
  [Truck, "logistica"],
  [Sparkles, "servicos"],
  [Globe, "internacional"],
];

export function ErpAudience() {
  const { t } = useTranslations(erpSectionsDictionary);

  const SEGMENTS = AUDIENCE_ICONS_KEYS.map(([icon, key]) => ({
    icon,
    key,
    label: t(`audience.${key}`),
  }));

  return (
    <Reveal as="section" className="erp-navy py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-14 max-w-2xl">
          <p className="erp-eyebrow">{t("audience.eyebrow")}</p>
          <h2 className="font-display mt-5 text-3xl font-semibold leading-tight sm:text-4xl">{t("audience.title")}</h2>
        </div>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {SEGMENTS.map((segment) => (
            <li
              key={segment.key}
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

const FEATURE_ICONS = [BarChart3, Users, Database, Smartphone, MessageCircle, KeyRound];

export function ErpFeatures() {
  const { t } = useTranslations(erpSectionsDictionary);

  const FEATURES = FEATURE_ICONS.map((icon, i) => ({
    icon,
    title: t(`features.f${i + 1}Title`),
    text: t(`features.f${i + 1}Text`),
  }));

  return (
    <Reveal as="section" id="funcionalidades" className="bg-[var(--surface)] py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-14 grid gap-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16">
          <div>
            <p className="erp-eyebrow erp-eyebrow-light">{t("features.eyebrow")}</p>
            <h2 className="font-display mt-5 text-3xl font-semibold leading-tight text-[var(--text-primary)] sm:text-4xl">
              {t("features.title")}
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
