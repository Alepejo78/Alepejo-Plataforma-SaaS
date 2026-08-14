"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib";
import { useTabs } from "@/providers/TabsProvider";

import {
  isMenuGroup,
  type MenuEntry,
  type MenuItem,
} from "./Sidebar.types";
import { sidebarStyles } from "./Sidebar.styles";

function isItemActive(pathname: string, href: string) {
  if (href === "#") {
    return false;
  }

  if (href === "/") {
    return pathname === "/";
  }

  return (
    pathname === href || pathname.startsWith(`${href}/`)
  );
}

/**
 * Item folha do menu (navega para uma rota).
 */
function LeafItem({
  item,
  collapsed,
  nested = false,
  onNavigate,
}: {
  item: MenuItem;
  collapsed: boolean;
  nested?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { openTab } = useTabs("erp");

  const active =
    !item.disabled && isItemActive(pathname, item.href);

  function handleClick(
    event: React.MouseEvent<HTMLAnchorElement>
  ) {
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

  const Icon = item.icon;

  const content = (
    <>
      {Icon ? (
        <Icon
          size={nested ? 18 : 20}
          className="shrink-0"
        />
      ) : null}

      {!collapsed && (
        <span className="truncate">{item.title}</span>
      )}
    </>
  );

  const baseClassName = cn(
    sidebarStyles.navigationItem,
    active && sidebarStyles.navigationItemActive,
    collapsed
      ? "justify-center px-0"
      : nested
        ? "h-10 justify-start gap-3 pl-11 pr-4 text-[13px]"
        : "justify-start gap-3 px-4"
  );

  if (item.disabled) {
    return (
      <span
        aria-disabled="true"
        title={
          collapsed
            ? `${item.title} (em breve)`
            : "Em breve"
        }
        className={cn(
          baseClassName,
          "cursor-not-allowed opacity-40"
        )}
      >
        {content}
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      title={collapsed ? item.title : undefined}
      className={baseClassName}
      onClick={handleClick}
    >
      {content}
    </Link>
  );
}

/**
 * Grupo do menu: abre e fecha revelando os itens do módulo.
 * Abre automaticamente quando a página atual pertence ao grupo.
 */
function GroupItem({
  entry,
  collapsed,
  onNavigate,
}: {
  entry: Extract<MenuEntry, { children: MenuItem[] }>;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  const hasActiveChild = entry.children.some(
    (child) =>
      !child.disabled && isItemActive(pathname, child.href)
  );

  const [open, setOpen] = useState(hasActiveChild);

  useEffect(() => {
    if (hasActiveChild) {
      setOpen(true);
    }
  }, [hasActiveChild]);

  const Icon = entry.icon;

  // Recolhida, a barra não tem espaço para submenu: os filhos
  // aparecem como ícones diretos.
  if (collapsed) {
    return (
      <div className="space-y-1 border-b border-[var(--border)] pb-2 last:border-0">
        {entry.children.map((child) => (
          <LeafItem
            key={child.id}
            item={child}
            collapsed
            onNavigate={onNavigate}
          />
        ))}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        aria-expanded={open}
        className={cn(
          sidebarStyles.navigationItem,
          "w-full justify-start gap-3 px-4",
          hasActiveChild &&
            "text-[var(--text-primary)]"
        )}
      >
        <Icon size={20} className="shrink-0" />

        <span className="flex-1 truncate text-left">
          {entry.title}
        </span>

        <ChevronDown
          size={16}
          className={cn(
            "shrink-0 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="mt-1 space-y-1">
          {entry.children.map((child) => (
            <LeafItem
              key={child.id}
              item={child}
              collapsed={false}
              nested
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function SidebarItem({
  item,
  collapsed,
  onNavigate,
}: {
  item: MenuEntry;
  collapsed: boolean;
  /** Chamado depois de uma navegação bem-sucedida — fecha o overlay do menu. */
  onNavigate?: () => void;
}) {
  if (isMenuGroup(item)) {
    return (
      <GroupItem
        entry={item}
        collapsed={collapsed}
        onNavigate={onNavigate}
      />
    );
  }

  return (
    <LeafItem
      item={item}
      collapsed={collapsed}
      onNavigate={onNavigate}
    />
  );
}
