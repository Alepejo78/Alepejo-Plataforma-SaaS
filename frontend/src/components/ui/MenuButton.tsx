"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

export interface MenuButtonItem {
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
  /** Presente = vira submenu (flyout), não uma ação direta. */
  items?: MenuButtonItem[];
}

interface MenuRowProps {
  item: MenuButtonItem;
  onDone: () => void;
}

function MenuRow({ item, onDone }: MenuRowProps) {
  const [subOpen, setSubOpen] = useState(false);

  if (item.items && item.items.length > 0) {
    return (
      <div
        className="relative"
        onMouseEnter={() => setSubOpen(true)}
        onMouseLeave={() => setSubOpen(false)}
      >
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
        >
          <span className="flex items-center gap-2">
            {item.icon}
            {item.label}
          </span>
          <ChevronRight size={14} />
        </button>

        {subOpen && (
          <div className="absolute right-full top-0 z-30 mr-1 w-52 space-y-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 shadow-lg">
            {item.items.map((sub, i) => (
              <MenuRow key={i} item={sub} onDone={onDone} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        item.onClick?.();
        onDone();
      }}
      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
    >
      {item.icon}
      {item.label}
    </button>
  );
}

interface MenuButtonProps {
  label: string;
  icon: ReactNode;
  items: MenuButtonItem[];
  align?: "left" | "right";
}

/** Botão com seta que abre um menu de ações — itens com `items` viram submenu (flyout ao passar o mouse). */
export function MenuButton({
  label,
  icon,
  items,
  align = "right",
}: MenuButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
      >
        {icon}
        {label}
        <ChevronDown size={14} />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />

          <div
            className={`absolute ${align === "right" ? "right-0" : "left-0"} z-20 mt-2 w-56 space-y-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 shadow-lg`}
          >
            {items.map((item, i) => (
              <MenuRow key={i} item={item} onDone={() => setOpen(false)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
