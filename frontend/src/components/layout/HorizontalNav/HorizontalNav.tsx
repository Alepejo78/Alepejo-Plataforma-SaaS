"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Lock } from "lucide-react";

import { cn } from "@/lib";
import { useMenu } from "@/hooks/useMenu";
import { stripCompanySlug, useTabs } from "@/providers/TabsProvider";

import {
  isMenuGroup,
  type MenuEntry,
  type MenuGroup,
  type MenuItem,
} from "../Sidebar/Sidebar.types";

function isItemActive(pathname: string, href: string) {
  if (href === "#") {
    return false;
  }

  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

const itemClass = [
  "flex h-10 items-center gap-2 whitespace-nowrap rounded-xl px-3 text-sm font-medium",
  "text-[var(--text-secondary)] transition-colors duration-200",
  "hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]",
].join(" ");

const activeItemClass =
  "bg-[var(--primary)] text-[var(--primary-contrast)] hover:bg-[var(--primary-hover)] hover:text-[var(--primary-contrast)]";

function TopLeaf({
  item,
  fullWidth = false,
  onNavigate,
}: {
  item: MenuItem;
  fullWidth?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = stripCompanySlug(usePathname());
  const active = !item.disabled && isItemActive(pathname, item.href);
  const Icon = item.icon;
  const { openTab } = useTabs("erp");

  const content = (
    <>
      {Icon ? (
        <Icon
          size={16}
          className="shrink-0"
          data-icon-anim={item.iconAnim}
        />
      ) : null}
      {item.title}
      {item.locked && <Lock size={12} className="shrink-0 opacity-70" />}
    </>
  );

  if (item.disabled) {
    return (
      <span
        aria-disabled="true"
        title="Em breve"
        className={cn(
          itemClass,
          fullWidth && "w-full",
          "cursor-not-allowed opacity-40"
        )}
      >
        {content}
      </span>
    );
  }

  if (item.locked) {
    return (
      <Link
        href="/erp/licenciamento"
        title="Módulo não contratado — clique para adquirir"
        onClick={onNavigate}
        className={cn(
          itemClass,
          fullWidth && "w-full",
          "opacity-60 hover:opacity-100"
        )}
      >
        {content}
      </Link>
    );
  }

  function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    // Ctrl/Cmd/clique-do-meio: deixa o navegador abrir numa aba nova de
    // verdade, sem mexer nas guias desta aba.
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    ) {
      return;
    }

    event.preventDefault();

    const opened = openTab({ href: item.href, title: item.title });

    if (opened) {
      onNavigate?.();
    }
  }

  return (
    <Link
      href={item.href}
      onClick={handleClick}
      className={cn(
        itemClass,
        fullWidth && "w-full",
        active && activeItemClass
      )}
    >
      {content}
    </Link>
  );
}

function TopGroup({
  entry,
  open,
  onToggle,
  onNavigate,
}: {
  entry: MenuGroup;
  open: boolean;
  onToggle: () => void;
  onNavigate: () => void;
}) {
  const pathname = stripCompanySlug(usePathname());

  const hasActiveChild = entry.children.some(
    (child) => !child.disabled && isItemActive(pathname, child.href)
  );

  const Icon = entry.icon;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={cn(
          itemClass,
          hasActiveChild && "text-[var(--text-primary)]"
        )}
      >
        <Icon
          size={16}
          className="shrink-0"
          data-icon-anim={entry.iconAnim}
        />
        {entry.title}
        <ChevronDown
          size={14}
          className={cn(
            "shrink-0 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      {/* Flutua por cima da página (não empurra nem precisa de
          rolagem) e fica aberto até outro módulo ser escolhido ou
          até clicar fora. */}
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-56 space-y-0.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-lg">
          {entry.children.map((child) => (
            <TopLeaf
              key={child.id}
              item={child}
              fullWidth
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Alternativa à Sidebar lateral: menu em barra horizontal no topo
 * (estilo ribbon). Escolhida em Configurações → Personalização
 * (módulo BRANDING); sem o módulo, o layout fica sempre vertical.
 */
export function HorizontalNav() {
  const menuItems = useMenu();
  const [openGroupId, setOpenGroupId] = useState<string | null>(
    null
  );
  const rootRef = useRef<HTMLDivElement>(null);

  // Fecha ao clicar fora — o dropdown some, mas nunca "some sozinho"
  // ao só passar o mouse por cima de outra coisa.
  useEffect(() => {
    if (!openGroupId) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpenGroupId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () =>
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
  }, [openGroupId]);

  return (
    <div
      ref={rootRef}
      className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-sm"
    >
      <nav className="flex min-w-0 flex-wrap items-center gap-1 px-4 py-2">
        {menuItems.map((entry: MenuEntry) =>
          isMenuGroup(entry) ? (
            <TopGroup
              key={entry.id}
              entry={entry}
              open={openGroupId === entry.id}
              onToggle={() =>
                setOpenGroupId((current) =>
                  current === entry.id ? null : entry.id
                )
              }
              onNavigate={() => setOpenGroupId(null)}
            />
          ) : (
            <TopLeaf key={entry.id} item={entry} />
          )
        )}
      </nav>
    </div>
  );
}
