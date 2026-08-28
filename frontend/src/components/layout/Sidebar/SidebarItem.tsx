"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Lock } from "lucide-react";

import { cn } from "@/lib";
import { stripCompanySlug, useTabs } from "@/providers/TabsProvider";

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
  const pathname = stripCompanySlug(usePathname());
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
          data-icon-anim={item.iconAnim}
          className={cn(
            sidebarStyles.navigationIcon,
            active && sidebarStyles.navigationIconActive
          )}
        />
      ) : null}

      {!collapsed && (
        <span className="truncate">{item.title}</span>
      )}

      {item.locked && !collapsed && (
        <Lock size={13} className="ml-auto shrink-0 opacity-70" />
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

  if (item.locked) {
    return (
      <Link
        href="/erp/licenciamento"
        title={
          collapsed
            ? `${item.title} — clique para adquirir`
            : "Módulo não contratado — clique para adquirir"
        }
        className={cn(baseClassName, "opacity-60 hover:opacity-100")}
        onClick={onNavigate}
      >
        {content}
      </Link>
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
  const pathname = stripCompanySlug(usePathname());

  const hasActiveChild = entry.children.some(
    (child) =>
      !child.disabled && isItemActive(pathname, child.href)
  );

  const [open, setOpen] = useState(hasActiveChild);
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const [flyoutPosition, setFlyoutPosition] = useState({
    top: 0,
    left: 0,
  });

  const buttonRef = useRef<HTMLButtonElement>(null);
  const flyoutRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (hasActiveChild) {
      setOpen(true);
    }
  }, [hasActiveChild]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!flyoutOpen) {
      return;
    }

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;

      if (
        buttonRef.current?.contains(target) ||
        flyoutRef.current?.contains(target)
      ) {
        return;
      }

      setFlyoutOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () =>
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
  }, [flyoutOpen]);

  const Icon = entry.icon;

  // Recolhida, a barra só mostra o ícone do menu — clicar abre um
  // submenu flutuante (portal, pra não ser cortado pelo scroll da
  // nav) com os filhos; escolher um item ou clicar fora fecha de novo.
  if (collapsed) {
    function toggleFlyout() {
      if (!flyoutOpen && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();

        setFlyoutPosition({
          top: rect.top,
          left: rect.right + 8,
        });
      }

      setFlyoutOpen((previous) => !previous);
    }

    return (
      <div>
        <button
          ref={buttonRef}
          type="button"
          onClick={toggleFlyout}
          title={entry.title}
          aria-label={entry.title}
          aria-expanded={flyoutOpen}
          className={cn(
            sidebarStyles.navigationItem,
            "w-full justify-center px-0",
            (hasActiveChild || flyoutOpen) &&
              "text-[var(--text-primary)]"
          )}
        >
          <Icon
          size={20}
          data-icon-anim={entry.iconAnim}
          className={cn(
            sidebarStyles.navigationIcon,
            hasActiveChild && sidebarStyles.navigationIconActive,
            hasActiveChild && "text-[var(--primary)]"
          )}
        />
        </button>

        {mounted &&
          flyoutOpen &&
          createPortal(
            <div
              ref={flyoutRef}
              style={{
                position: "fixed",
                top: flyoutPosition.top,
                left: flyoutPosition.left,
              }}
              className="z-50 w-56 space-y-0.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-lg"
            >
              <p className="px-3 pb-1 pt-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                {entry.title}
              </p>

              {entry.children.map((child) => (
                <LeafItem
                  key={child.id}
                  item={child}
                  collapsed={false}
                  nested
                  onNavigate={() => {
                    setFlyoutOpen(false);
                    onNavigate?.();
                  }}
                />
              ))}
            </div>,
            document.body
          )}
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
        <Icon
          size={20}
          data-icon-anim={entry.iconAnim}
          className={cn(
            sidebarStyles.navigationIcon,
            hasActiveChild && sidebarStyles.navigationIconActive,
            hasActiveChild && "text-[var(--primary)]"
          )}
        />

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
