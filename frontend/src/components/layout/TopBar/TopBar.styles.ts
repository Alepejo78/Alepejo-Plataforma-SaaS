export const topBarStyles = {
  root: "flex h-16 shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-4 sm:px-6",
  mobileNavigationButton:
    "flex size-10 items-center justify-center rounded-xl text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 lg:hidden",
  workspace: "min-w-0",
  workspaceLabel: "truncate text-sm font-semibold text-zinc-950",
  company: "hidden items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2 sm:flex",
  companyIndicator: "size-2 shrink-0 rounded-full bg-emerald-500",
  companyName: "max-w-48 truncate text-sm font-medium text-zinc-700",
  userAvatar:
    "flex size-9 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-xs font-semibold text-white",
} as const;
