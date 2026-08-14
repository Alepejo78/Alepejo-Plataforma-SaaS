/**
 * Todas as cores vêm dos tokens em globals.css.
 * Não usar classes fixas do Tailwind: elas não acompanham a troca de tema.
 *
 * Reaproveitado hoje só pelo `CompanySwitcher` (o resto do antigo TopBar
 * virou a `AppTabsBar`, que já tem seu próprio estilo).
 */
export const topBarStyles = {
  company: [
    "hidden items-center gap-2 rounded-xl",
    "border border-[var(--border)]",
    "bg-[var(--surface-hover)] px-3 py-2 sm:flex",
  ].join(" "),

  companyIndicator:
    "size-2 shrink-0 rounded-full bg-[var(--success)]",

  companyName:
    "max-w-48 truncate text-sm font-medium text-[var(--text-secondary)]",
} as const;
