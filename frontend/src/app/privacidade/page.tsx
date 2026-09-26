"use client";

import Link from "next/link";

import { PublicNav } from "@/components/marketing/PublicNav";
import { erpFontVars } from "@/components/marketing/fonts";
import { PrivacyContentPtBr } from "@/components/marketing/PrivacyContentPtBr";
import { PrivacyContentEnUs } from "@/components/marketing/PrivacyContentEnUs";
import { useTranslations } from "@/lib/i18n/useTranslations";
import { privacidadeDictionary } from "@/lib/i18n/dictionaries/privacidade";
import "@/components/marketing/marketing-shared.css";
import "@/components/marketing/erp.css";

const lastUpdated = "30 de agosto de 2026";

export default function PrivacidadePage() {
  const { t, locale } = useTranslations(privacidadeDictionary);

  return (
    <div className={`${erpFontVars} theme-erp min-h-screen`}>
      <PublicNav />

      <section className="erp-hero">
        <div className="mx-auto max-w-3xl px-6 pb-14 pt-14">
          <p className="erp-rise erp-eyebrow" style={{ ["--i" as string]: 0 }}>
            {t("chrome.eyebrow")}
          </p>
          <h1
            className="erp-rise font-display mt-5 text-4xl font-semibold leading-tight sm:text-5xl"
            style={{ ["--i" as string]: 1 }}
          >
            {t("chrome.title")}
          </h1>
          <p className="erp-rise mt-4 text-sm text-[var(--erp-ice)]/70" style={{ ["--i" as string]: 2 }}>
            {t("chrome.lastUpdated").replace("{date}", lastUpdated)}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-6 py-14">
        {locale === "en-US" ? <PrivacyContentEnUs /> : <PrivacyContentPtBr />}

        <p className="mt-12 text-sm text-[var(--text-muted)]">
          <Link
            href="/institucional"
            className="font-medium text-[var(--primary)] hover:underline"
          >
            {t("chrome.backLink")}
          </Link>
        </p>
      </div>
    </div>
  );
}
