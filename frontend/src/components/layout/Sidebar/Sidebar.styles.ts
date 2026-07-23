export const sidebarStyles = {
  root: "fixed inset-y-0 left-0 z-40 flex h-dvh shrink-0 flex-col border-r border-zinc-200 bg-white lg:static lg:translate-x-0",
  brand: "flex h-16 items-center border-b border-zinc-200 px-4",
  navigation: "flex flex-1 flex-col gap-1 overflow-y-auto p-3",
  navigationItem:
    "group flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-zinc-600 transition-colors duration-200 hover:bg-zinc-100 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2",
  navigationItemActive: "bg-zinc-950 text-white hover:bg-zinc-800 hover:text-white",
  footer: "border-t border-zinc-200 p-3",
  collapseButton:
    "flex h-11 w-full items-center justify-center rounded-xl text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2",
} as const;
