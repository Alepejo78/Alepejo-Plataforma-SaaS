/**
 * Todas as cores vêm dos tokens em globals.css.
 * Não usar classes fixas do Tailwind: elas não acompanham a troca de tema.
 */
export const topBarStyles = {
  root: [
    "flex h-16 shrink-0 items-center justify-between gap-3",
    "rounded-3xl border border-[var(--border)]",
    "bg-[var(--surface)] px-4 shadow-sm sm:px-6",
  ].join(" "),

  mobileNavigationButton: [
    "flex size-10 items-center justify-center rounded-xl",
    "border border-[var(--border)]",
    "text-[var(--text-secondary)] transition-colors",
    "hover:border-[var(--border-strong)]",
    "hover:bg-[var(--surface-hover)]",
    "hover:text-[var(--text-primary)]",
    "md:hidden",
  ].join(" "),

  workspace: "min-w-0",

  workspaceLabel:
    "truncate text-sm font-semibold text-[var(--text-primary)]",

  company: [
    "hidden items-center gap-2 rounded-xl",
    "border border-[var(--border)]",
    "bg-[var(--surface-hover)] px-3 py-2 sm:flex",
  ].join(" "),

  companyIndicator:
    "size-2 shrink-0 rounded-full bg-[var(--success)]",

  companyName:
    "max-w-48 truncate text-sm font-medium text-[var(--text-secondary)]",

  userAvatar: [
    "flex size-9 shrink-0 items-center justify-center rounded-full",
    "bg-[var(--primary)] text-xs font-semibold",
    "text-[var(--primary-contrast)]",
  ].join(" "),
} as const;
