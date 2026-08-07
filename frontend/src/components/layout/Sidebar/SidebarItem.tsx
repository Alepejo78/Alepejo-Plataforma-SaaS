"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib";

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
}: {
  item: MenuItem;
  collapsed: boolean;
  nested?: boolean;
}) {
  const pathname = usePathname();

  const active =
    !item.disabled && isItemActive(pathname, item.href);

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
}: {
  entry: Extract<MenuEntry, { children: MenuItem[] }>;
  collapsed: boolean;
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
}: {
  item: MenuEntry;
  collapsed: boolean;
}) {
  if (isMenuGroup(item)) {
    return (
      <GroupItem entry={item} collapsed={collapsed} />
    );
  }

  return <LeafItem item={item} collapsed={collapsed} />;
}
