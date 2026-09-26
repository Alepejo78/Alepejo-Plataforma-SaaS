"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  CalendarCheck,
  CalendarClock,
  Gift,
  Hourglass,
  PackageCheck,
  Smartphone,
  Wallet,
} from "lucide-react";

import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { ContactSection } from "@/components/marketing/ContactSection";
import { Faq, useServicosFaqItems } from "@/components/marketing/Faq";
import { SERVICE_SEGMENTS } from "@/components/marketing/segments-data";
import { servicosFontVars } from "@/components/marketing/fonts";
import { Reveal } from "@/components/marketing/Reveal";
import { ServicosDemoTour } from "@/components/marketing/ServicosDemoTour";
import { ServicosShowcase } from "@/components/marketing/ServicosShowcase";
import { ServicosLab } from "@/components/marketing/ServicosLab";
import { ServicosTilt } from "@/components/marketing/ServicosTilt";
import { useTranslations } from "@/lib/i18n/useTranslations";
import { servicosDictionary } from "@/lib/i18n/dictionaries/servicos";
import { segmentsDictionary } from "@/lib/i18n/dictionaries/common";
import "@/components/marketing/marketing-shared.css";
import "@/components/marketing/servicos.css";

const STEP_IMAGES = [
  { src: "/marketing/servicos/passo1.webp", width: 336, height: 428, offset: "lg:mt-0", tilt: "lg:-rotate-2" },
  { src: "/marketing/servicos/passo2.webp", width: 356, height: 468, offset: "lg:mt-14", tilt: "lg:rotate-1" },
  { src: "/marketing/servicos/passo3.webp", width: 384, height: 394, offset: "lg:mt-6", tilt: "lg:-rotate-1" },
];

const BENEFIT_ICONS = [CalendarCheck, Bell, Hourglass, PackageCheck, Gift, Smartphone, Wallet];

export default function ServicosPage() {
  const { t } = useTranslations(servicosDictionary);
  const { t: tSegment } = useTranslations(segmentsDictionary);
  const servicosFaqItems = useServicosFaqItems();

  const NAV_LINKS = [
    { label: t("nav.teste"), href: "/servicos#teste" },
    { label: t("nav.recursos"), href: "/servicos#recursos" },
    { label: t("nav.segmentos"), href: "/servicos#segmentos" },
    { label: t("nav.duvidas"), href: "/servicos#perguntas-frequentes" },
    { label: t("nav.contato"), href: "/servicos#contato" },
  ];

  const HERO_POINTS = [t("hero.point1"), t("hero.point2"), t("hero.point3")];

  const STEPS = STEP_IMAGES.map((img, i) => ({
    n: String(i + 1),
    title: t(`steps.step${i + 1}Title`),
    text: t(`steps.step${i + 1}Text`),
    alt: t(`steps.step${i + 1}Alt`),
    ...img,
  }));

  const BENEFITS = BENEFIT_ICONS.map((icon, i) => ({
    icon,
    title: t(`benefits.b${i + 1}Title`),
    text: t(`benefits.b${i + 1}Text`),
  }));

  return (
    <div className={`${servicosFontVars} marketing-page theme-servicos`}>
      <MarketingNav links={NAV_LINKS} ctaLabel={t("nav.ctaPlanos")} ctaHref="/servicos/planos" />

      {/* Abertura */}
      <section className="sv-hero">
        <div className="mx-auto grid max-w-7xl gap-14 px-6 pb-20 pt-16 lg:min-h-[calc(100dvh-4.5rem)] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center lg:gap-10 lg:py-20">
          <div className="max-w-xl">
            <p className="sv-rise sv-eyebrow" style={{ ["--i" as string]: 0 }}>
              {t("hero.eyebrow")}
            </p>
            <h1
              className="sv-rise font-display mt-6 text-4xl font-semibold leading-[1.05] sm:text-5xl lg:text-[3.4rem]"
              style={{ ["--i" as string]: 1 }}
            >
              {t("hero.title")}
            </h1>
            <p
              className="sv-rise mt-6 max-w-[52ch] text-lg leading-relaxed text-[var(--sv-cream)]/80"
              style={{ ["--i" as string]: 2 }}
            >
              {t("hero.subtitle")}
            </p>

            <div className="sv-rise mt-9 flex flex-wrap items-center gap-3" style={{ ["--i" as string]: 3 }}>
              <Link href="/servicos/planos" className="sv-btn sv-btn-gold">
                {t("hero.ctaComecar")}
                <ArrowRight size={17} aria-hidden />
              </Link>
              <Link href="/servicos#contato" className="sv-btn sv-btn-ghost">
                {t("hero.ctaConsultor")}
              </Link>
            </div>

            <ul
              className="sv-rise mt-10 flex flex-wrap gap-x-6 gap-y-2 border-t border-[var(--sv-night-line)] pt-6 text-sm text-[var(--sv-cream)]/75"
              style={{ ["--i" as string]: 4 }}
            >
              {HERO_POINTS.map((point) => (
                <li key={point} className="flex items-center gap-2">
                  <span aria-hidden className="size-1.5 rounded-full bg-[var(--sv-gold)]" />
                  {point}
                </li>
              ))}
            </ul>
          </div>

          <ServicosTilt className="sv-rise relative pb-16 lg:pl-6" >
            <div className="sv-laptop" style={{ ["--i" as string]: 2 }}>
              <div className="sv-laptop-screen">
                <Image
                  src="/marketing/servicos/agenda.webp"
                  alt="Agenda do dia do AlePejo Serviços, com cliente, serviço, profissional e valor de cada horário"
                  width={1600}
                  height={643}
                  priority
                  sizes="(min-width: 1024px) 58vw, 100vw"
                  className="sv-shot"
                />
              </div>
              <div className="sv-laptop-base" aria-hidden />
            </div>

            <div className="sv-float sv-glass absolute -bottom-2 left-2 w-[42%] max-w-[15rem] overflow-hidden rounded-2xl p-1.5 sm:left-6 lg:-left-2">
              <Image
                src="/marketing/servicos/passo3.webp"
                alt="Tela de agendamento confirmado no link público"
                width={384}
                height={394}
                sizes="240px"
                priority
                className="h-auto w-full rounded-xl"
              />
            </div>
          </ServicosTilt>
        </div>
      </section>

      {/* Link público em três passos */}
      <Reveal as="section" className="bg-[var(--mkt-bg)] py-24">
        <div className="mx-auto grid max-w-7xl gap-14 px-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className="sv-eyebrow sv-eyebrow-light">{t("steps.eyebrow")}</p>
            <h2 className="font-display mt-5 text-3xl font-semibold leading-tight text-[var(--mkt-ink)] sm:text-4xl">
              {t("steps.title")}
            </h2>
            <p className="mt-5 max-w-[46ch] leading-relaxed text-[var(--mkt-muted)]">{t("steps.subtitle")}</p>
          </div>

          <ol className="grid items-start gap-8 sm:grid-cols-3">
            {STEPS.map((step) => (
              <li key={step.n} className={`sv-step ${step.offset}`}>
                <div className={step.tilt}>
                  <div className="overflow-hidden rounded-[1.4rem] border border-[var(--mkt-border)] bg-[var(--mkt-surface)] shadow-[0_28px_50px_-30px_rgb(70_45_10/0.45)]">
                  <Image
                    src={step.src}
                    alt={step.alt}
                    width={step.width}
                    height={step.height}
                    sizes="(min-width: 640px) 22vw, 90vw"
                    className="h-auto w-full"
                  />
                  </div>
                </div>
                <p className="mt-5 flex items-baseline gap-3">
                  <span className="font-display text-2xl font-semibold text-[var(--mkt-accent-2)]">{step.n}</span>
                  <span className="font-semibold text-[var(--mkt-ink)]">{step.title}</span>
                </p>
                <p className="mt-1 text-sm leading-relaxed text-[var(--mkt-muted)]">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </Reveal>

      {/* O sistema em uso */}
      <Reveal as="section" className="bg-[var(--mkt-bg-alt)] py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-14 max-w-2xl">
            <p className="sv-eyebrow sv-eyebrow-light">{t("showcase.eyebrow")}</p>
            <h2 className="font-display mt-5 text-3xl font-semibold leading-tight text-[var(--mkt-ink)] sm:text-4xl">
              {t("showcase.title")}
            </h2>
          </div>
          <ServicosShowcase />
        </div>
      </Reveal>

      {/* Demonstração interativa (preservada) */}
      <Reveal as="section" className="bg-[var(--mkt-bg)] py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-12 max-w-2xl">
            <p className="sv-eyebrow sv-eyebrow-light">{t("demo.eyebrow")}</p>
            <h2 className="font-display mt-5 text-3xl font-semibold leading-tight text-[var(--mkt-ink)] sm:text-4xl">
              {t("demo.title")}
            </h2>
            <p className="mt-4 leading-relaxed text-[var(--mkt-muted)]">{t("demo.subtitle")}</p>
          </div>
          <ServicosDemoTour />
        </div>
      </Reveal>

      <ServicosLab />

      {/* Benefícios */}
      <Reveal as="section" id="recursos" className="bg-[var(--mkt-bg-alt)] py-24">
        <div className="mx-auto grid max-w-7xl gap-14 px-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className="sv-eyebrow sv-eyebrow-light">{t("benefits.eyebrow")}</p>
            <h2 className="font-display mt-5 text-3xl font-semibold leading-tight text-[var(--mkt-ink)] sm:text-4xl">
              {t("benefits.title")}
            </h2>
          </div>
          <ul className="divide-y divide-[var(--mkt-border)] border-y border-[var(--mkt-border)]">
            {BENEFITS.map((benefit) => (
              <li key={benefit.title} className="sv-benefit grid grid-cols-[auto_1fr] gap-x-5 py-6">
                <span className="mt-0.5 flex size-11 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--mkt-accent-2)_16%,transparent)] text-[var(--mkt-accent)]">
                  <benefit.icon size={20} strokeWidth={1.75} aria-hidden />
                </span>
                <div>
                  <h3 className="font-display text-xl font-semibold text-[var(--mkt-ink)]">{benefit.title}</h3>
                  <p className="mt-1.5 max-w-[60ch] leading-relaxed text-[var(--mkt-muted)]">{benefit.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </Reveal>

      {/* Segmentos */}
      <Reveal as="section" id="segmentos" className="sv-night py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-14 max-w-2xl">
            <p className="sv-eyebrow">{t("segments.eyebrow")}</p>
            <h2 className="font-display mt-5 text-3xl font-semibold leading-tight sm:text-4xl">
              {t("segments.title")}
            </h2>
            <p className="mt-4 leading-relaxed text-[var(--sv-cream)]/75">{t("segments.subtitle")}</p>
          </div>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {SERVICE_SEGMENTS.map((segment) => (
              <li
                key={segment.key}
                className="sv-segment sv-glass flex items-center gap-3 rounded-2xl px-4 py-4"
              >
                <segment.icon size={20} strokeWidth={1.75} className="shrink-0 text-[var(--sv-gold)]" aria-hidden />
                <span className="text-sm font-medium">{tSegment(`segments.${segment.key}`)}</span>
              </li>
            ))}
          </ul>
        </div>
      </Reveal>

      {/* Chamada final */}
      <section className="bg-[var(--mkt-bg)] py-24">
        <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-8 px-6 md:flex-row md:items-center">
          <div>
            <p className="sv-eyebrow sv-eyebrow-light">{t("final.eyebrow")}</p>
            <h2 className="font-display mt-5 max-w-[20ch] text-3xl font-semibold leading-tight text-[var(--mkt-ink)] sm:text-4xl">
              {t("final.title")}
            </h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/servicos/planos" className="sv-btn sv-btn-ink">
              {t("final.ctaPlanos")}
              <CalendarClock size={17} aria-hidden />
            </Link>
            <Link
              href="/servicos#contato"
              className="sv-btn border border-[var(--mkt-border)] text-[var(--mkt-ink)] hover:border-[var(--mkt-accent-2)]"
            >
              {t("final.ctaConsultor")}
            </Link>
          </div>
        </div>
      </section>

      <Faq items={servicosFaqItems} contactHref="/servicos#contato" />

      <ContactSection title={t("contact.title")} description={t("contact.description")} />

      <MarketingFooter page="servicos" />
    </div>
  );
}
