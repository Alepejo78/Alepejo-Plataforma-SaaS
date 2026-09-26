"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Eye } from "lucide-react";

import { siteVisitService } from "@/services/site-visit.service";
import { useTranslations } from "@/lib/i18n/useTranslations";
import { marketingFooterDictionary } from "@/lib/i18n/dictionaries/common";

/** Mesmo contador de visitas do rodapé institucional, sob outra chave de página. */
function useVisitCounter(page: string) {
  const [count, setCount] = useState<number | null>(null);
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) {
      return;
    }

    fired.current = true;

    siteVisitService.increment(page).then(setCount).catch(() => {});
  }, [page]);

  return count;
}

export function MarketingFooter({ page }: { page: string }) {
  const visits = useVisitCounter(page);
  const { t, locale } = useTranslations(marketingFooterDictionary);

  return (
    <footer className="border-t border-[var(--mkt-border)] py-8">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 text-xs text-[var(--mkt-muted)]">
        <p>
          © {new Date().getFullYear()} {t("footer.copyright")}
        </p>

        <div className="flex flex-wrap items-center gap-4">
          {visits != null && (
            <span className="flex items-center gap-1.5">
              <Eye size={13} />
              {visits.toLocaleString(locale)} {t("footer.visits")}
            </span>
          )}

          <Link
            href="/privacidade"
            className="font-medium hover:text-[var(--mkt-ink)] hover:underline"
          >
            {t("footer.privacy")}
          </Link>
        </div>
      </div>
    </footer>
  );
}
