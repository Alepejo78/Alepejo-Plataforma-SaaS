"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";

import { useTranslations } from "@/lib/i18n/useTranslations";
import { erpFaqDictionary, faqChromeDictionary, servicosFaqDictionary } from "@/lib/i18n/dictionaries/faq";
import "./marketing-shared.css";

export interface FaqItem {
  question: string;
  answer: string;
}

/** Perguntas do AlePejo ERP (exibidas em /institucional) — já traduzidas via `useFaqItems`. */
export function useErpFaqItems(): FaqItem[] {
  const { tItems } = useTranslations(erpFaqDictionary);
  return tItems<FaqItem>("items");
}

/** Perguntas do AlePejo Serviços (exibidas em /servicos) — já traduzidas via `useFaqItems`. */
export function useServicosFaqItems(): FaqItem[] {
  const { tItems } = useTranslations(servicosFaqDictionary);
  return tItems<FaqItem>("items");
}

/**
 * Perguntas frequentes — sanfona animada, uma aberta por vez. Lê só os
 * tokens `--mkt-*` (definidos por cada tema), então serve às duas páginas.
 */
export function Faq({
  items,
  title,
  contactHref,
  id = "perguntas-frequentes",
}: {
  items: FaqItem[];
  title?: string;
  /** Link do "Fale com a gente" no rodapé — cada página aponta pro seu contato. */
  contactHref: string;
  id?: string;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const base = useId();
  const { t } = useTranslations(faqChromeDictionary);

  return (
    <section id={id} className="scroll-mt-20 bg-[var(--mkt-bg-alt)] py-24">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="mkt-eyebrow">{t("faq.eyebrow")}</p>
          <h2 className="font-display mt-5 text-3xl font-semibold leading-tight text-[var(--mkt-ink)] sm:text-4xl">
            {title ?? t("faq.defaultTitle")}
          </h2>
          <p className="mt-4 text-sm text-[var(--mkt-muted)]">
            {t("faq.notFound")}{" "}
            <a href={contactHref} className="font-semibold text-[var(--mkt-accent)] underline-offset-4 hover:underline">
              {t("faq.contactLink")}
            </a>
            .
          </p>
        </div>

        <ul className="divide-y divide-[var(--mkt-border)] border-y border-[var(--mkt-border)]">
          {items.map((item, index) => {
            const isOpen = openIndex === index;
            const panelId = `${base}-p${index}`;
            const buttonId = `${base}-b${index}`;

            return (
              <li key={item.question}>
                <h3>
                  <button
                    type="button"
                    id={buttonId}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="mkt-acc-btn flex w-full items-center justify-between gap-4 py-5 text-left"
                  >
                    <span className="font-display text-lg font-semibold text-[var(--mkt-ink)]">{item.question}</span>
                    <ChevronDown
                      size={18}
                      aria-hidden
                      className={`mkt-acc-chevron shrink-0 text-[var(--mkt-muted)] ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                </h3>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  className="mkt-acc-panel"
                  data-open={isOpen}
                >
                  <div>
                    <p className="max-w-[68ch] pb-5 leading-relaxed text-[var(--mkt-muted)]">{item.answer}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
