"use client";

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
import { useTranslations } from "@/lib/i18n/useTranslations";
import { inicioDictionary } from "@/lib/i18n/dictionaries/inicio";
import { segmentsDictionary } from "@/lib/i18n/dictionaries/common";
import "@/components/marketing/marketing-shared.css";
import "@/components/marketing/servicos.css";
import "@/components/marketing/erp.css";
import "@/components/marketing/inicio.css";

const ERP_MODULE_ICONS = [Boxes, ShoppingCart, Wallet, Users, Building2, TrendingUp];
const ERP_MODULE_KEYS = ["estoque", "comprasVendas", "financeiro", "rhFolha", "multiunidade", "indicadores"];

export default function InicioPage() {
  const { t } = useTranslations(inicioDictionary);
  const { t: tSegment } = useTranslations(segmentsDictionary);

  const ERP_MODULES = ERP_MODULE_KEYS.map((key, i) => ({
    key,
    label: t(`erpModules.${key}`),
    icon: ERP_MODULE_ICONS[i],
  }));

  const NAV_LINKS = [
    { label: t("nav.sobre"), href: "/inicio#sobre" },
    { label: t("nav.sistemas"), href: "/inicio#sistemas" },
    { label: t("nav.contato"), href: "/inicio#contato" },
  ];

  const TIMELINE = [
    { cell: "A1", title: t("timeline.a1Title"), text: t("timeline.a1Text") },
    { cell: "B1", title: t("timeline.b1Title"), text: t("timeline.b1Text") },
    { cell: "C1", title: t("timeline.c1Title"), text: t("timeline.c1Text") },
    { cell: "D1", title: t("timeline.d1Title"), text: t("timeline.d1Text") },
  ];

  return (
    <div className={`${servicosDisplay.variable} ${erpBody.variable} marketing-page theme-inicio`}>
      <MarketingNav
        links={NAV_LINKS}
        ctaLabel={t("nav.ctaServicos")}
        ctaHref="/servicos"
        secondaryCtaLabel={t("nav.ctaErp")}
        secondaryCtaHref="/institucional"
        secondaryCtaClassName="erp-btn erp-btn-primary !hidden !px-5 !py-2.5 sm:!inline-flex"
        ctaClassName="sv-btn sv-btn-gold !px-5 !py-2.5"
      />

      {/* Abertura */}
      <section className="in-hero">
        <div className="mx-auto grid max-w-7xl gap-14 px-6 pb-20 pt-16 lg:min-h-[calc(100dvh-4.5rem)] lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:items-center lg:gap-12 lg:py-20">
          <div className="max-w-2xl">
            <p className="in-rise mkt-eyebrow" style={{ ["--i" as string]: 0 }}>
              {t("hero.eyebrow")}
            </p>
            <h1
              className="in-rise font-display mt-6 text-4xl font-semibold leading-[1.06] text-[var(--mkt-ink)] sm:text-5xl lg:text-[3.3rem]"
              style={{ ["--i" as string]: 1 }}
            >
              {t("hero.title")}
            </h1>
            <p
              className="in-rise mt-6 max-w-[54ch] text-lg leading-relaxed text-[var(--mkt-muted)]"
              style={{ ["--i" as string]: 2 }}
            >
              {t("hero.subtitle")}
            </p>

            <div className="in-rise mt-9 flex flex-wrap items-center gap-3" style={{ ["--i" as string]: 3 }}>
              <Link href="/servicos" className="sv-btn sv-btn-gold">
                {t("hero.ctaServicos")}
                <ArrowRight size={17} aria-hidden />
              </Link>
              <Link href="/institucional" className="erp-btn erp-btn-primary">
                <Boxes size={17} aria-hidden />
                {t("hero.ctaErp")}
              </Link>
            </div>
          </div>

          <div className="in-rise" style={{ ["--i" as string]: 3 }}>
            <SystemsStackedCards />
            <p className="mt-4 text-xs text-[var(--mkt-muted)]">{t("hero.screenshotsNote")}</p>
          </div>
        </div>
      </section>

      {/* Sobre */}
      <Reveal as="section" id="sobre" className="scroll-mt-20 bg-[var(--mkt-bg-alt)] py-24">
        <div className="mx-auto grid max-w-7xl gap-14 px-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className="mkt-eyebrow">{t("sobre.eyebrow")}</p>
            <h2 className="font-display mt-5 text-3xl font-semibold leading-tight text-[var(--mkt-ink)] sm:text-4xl">
              {t("sobre.title")}
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
                          key={module.key}
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
                          key={segment.key}
                          className="in-chip inline-flex items-center gap-1.5 rounded-full border border-[var(--mkt-border)] bg-[var(--mkt-surface)] px-3 py-1.5 text-xs font-medium text-[var(--mkt-ink)]"
                        >
                          <segment.icon size={13} className="text-[var(--mkt-accent-2)]" aria-hidden />
                          {tSegment(`segments.${segment.key}`)}
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
            <p className="mkt-eyebrow">{t("sistemas.eyebrow")}</p>
            <h2 className="font-display mt-5 text-3xl font-semibold leading-tight text-[var(--mkt-ink)] sm:text-4xl">
              {t("sistemas.title")}
            </h2>
            <p className="mt-4 leading-relaxed text-[var(--mkt-muted)]">{t("sistemas.subtitle")}</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <article className="in-door in-door-erp">
              <div className="p-8 pb-0 sm:p-10 sm:pb-0">
                <span className="mkt-eyebrow !text-[var(--erp-blue)]">{t("sistemas.erpEyebrow")}</span>
                <h3 className="font-display mt-4 text-2xl font-semibold">{t("sistemas.erpTitle")}</h3>
                <p className="mt-3 max-w-[48ch] text-[15px] leading-relaxed text-[var(--erp-ice)]/80">
                  {t("sistemas.erpText")}
                </p>
                <ul className="mt-4 space-y-1.5 text-sm text-[var(--erp-ice)]/80">
                  <li>• {t("sistemas.erpBullet1")}</li>
                  <li>• {t("sistemas.erpBullet2")}</li>
                  <li>• {t("sistemas.erpBullet3")}</li>
                  <li>• {t("sistemas.erpBullet4")}</li>
                </ul>
                <Link href="/institucional" className="erp-btn erp-btn-primary mt-6">
                  {t("sistemas.erpCta")}
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
                <span className="mkt-eyebrow !text-[var(--sv-gold)]">{t("sistemas.srvEyebrow")}</span>
                <h3 className="font-display mt-4 text-2xl font-semibold">{t("sistemas.srvTitle")}</h3>
                <p className="mt-3 max-w-[48ch] text-[15px] leading-relaxed text-[var(--sv-cream)]/80">
                  {t("sistemas.srvText")}
                </p>
                <ul className="mt-4 space-y-1.5 text-sm text-[var(--sv-cream)]/80">
                  <li>• {t("sistemas.srvBullet1")}</li>
                  <li>• {t("sistemas.srvBullet2")}</li>
                  <li>• {t("sistemas.srvBullet3")}</li>
                  <li>• {t("sistemas.srvBullet4")}</li>
                </ul>
                <Link href="/servicos" className="sv-btn sv-btn-gold mt-6">
                  {t("sistemas.srvCta")}
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
            {t("strip.suporte")}
          </li>
          <li className="flex items-center gap-2">
            <MapPin size={16} className="text-[var(--mkt-accent)]" aria-hidden />
            {t("strip.atendimento")}
          </li>
        </ul>
      </div>

      <ContactSection />

      <MarketingFooter page="inicio" />
    </div>
  );
}
