/**
 * Todas as cores vêm dos tokens em globals.css.
 * Não usar classes fixas do Tailwind (bg-[var(--surface)], text-[var(--text-secondary)], ...):
 * elas não acompanham a troca de tema.
 */
export const sidebarStyles = {
  root: [
    "fixed inset-y-0 left-0 z-40 flex h-dvh shrink-0 flex-col",
    "rounded-3xl border border-[var(--border)]",
    "bg-[var(--surface)] shadow-sm",
    "md:static md:translate-x-0",
  ].join(" "),

  brand:
    "flex h-16 items-center border-b border-[var(--border)] px-4",

  navigation:
    "flex flex-1 flex-col gap-1 overflow-y-auto p-3",

  navigationItem: [
    "group flex h-11 items-center rounded-xl text-sm font-medium",
    "text-[var(--text-secondary)]",
    "transition-colors duration-200",
    "hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]",
  ].join(" "),

  navigationItemActive: [
    "bg-[var(--primary)] text-[var(--primary-contrast)]",
    "hover:bg-[var(--primary-hover)] hover:text-[var(--primary-contrast)]",
  ].join(" "),

  footer: "border-t border-[var(--border)] p-3",

  iconButton: [
    "flex items-center justify-center rounded-xl",
    "border border-[var(--border)]",
    "text-[var(--text-secondary)]",
    "transition-colors",
    "hover:border-[var(--border-strong)]",
    "hover:bg-[var(--surface-hover)]",
    "hover:text-[var(--text-primary)]",
  ].join(" "),
} as const;
