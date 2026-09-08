"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Menu, Pin, PinOff, X, XCircle } from "lucide-react";

import { useTabs, type AppKey } from "@/providers/TabsProvider";

interface TabsBarProps {
  app: AppKey;
  /** Só o ERP tem sidebar pra mostrar/esconder — OS navega só por cards. */
  onOpenMenu?: () => void;
  isMenuOpen?: boolean;
}

interface MenuState {
  href: string;
  title: string;
  pinned: boolean;
  isHome: boolean;
  top: number;
  left: number;
}

/** Guias de 2º nível (telas abertas dentro do app atual). */
export function TabsBar({ app, onOpenMenu, isMenuOpen }: TabsBarProps) {
  const {
    openTabs,
    activeHref,
    homeHref,
    closeTab,
    closeAllTabs,
    pinTab,
    unpinTab,
    capMessage,
  } = useTabs(app);

  const [menu, setMenu] = useState<MenuState | null>(null);
  const [mounted, setMounted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!menu) {
      return;
    }

    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current?.contains(event.target as Node)) {
        return;
      }

      setMenu(null);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenu(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menu]);

  function openContextMenu(
    event: React.MouseEvent,
    tab: { href: string; title: string; pinned?: boolean }
  ) {
    event.preventDefault();

    setMenu({
      href: tab.href,
      title: tab.title,
      pinned: Boolean(tab.pinned),
      isHome: tab.href === homeHref,
      top: event.clientY,
      left: event.clientX,
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-1.5">
        {onOpenMenu && (
          <button
            type="button"
            onClick={onOpenMenu}
            aria-label={isMenuOpen ? "Fechar menu" : "Abrir menu"}
            className="flex size-9 shrink-0 items-center justify-center rounded-xl text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
          >
            {isMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        )}

        {openTabs.map((tab) => {
          const active = tab.href === activeHref;
          const isHome = tab.href === homeHref;
          const closable = !isHome && !tab.pinned;

          return (
            <div
              key={tab.href}
              onContextMenu={(event) => openContextMenu(event, tab)}
              className={`flex items-center gap-1 rounded-xl px-1 transition-colors ${
                active
                  ? "bg-[var(--primary-soft)] text-[var(--primary-text)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
              }`}
            >
              <Link
                href={tab.href}
                className="max-w-40 truncate py-2 pl-2.5 text-sm font-medium"
                title={tab.title}
              >
                {tab.title}
              </Link>

              {tab.pinned && (
                <span
                  title="Guia fixada — clique com o botão direito para desafixar"
                  className="flex size-6 shrink-0 items-center justify-center text-[var(--text-muted)]"
                >
                  <Pin size={13} />
                </span>
              )}

              {closable && (
                <button
                  type="button"
                  onClick={() => closeTab(tab.href)}
                  aria-label={`Fechar ${tab.title}`}
                  className="flex size-6 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {capMessage && (
        <div className="rounded-xl border border-[var(--warning)] bg-[var(--warning-soft)] px-3 py-2 text-xs font-medium text-[var(--warning)]">
          {capMessage}
        </div>
      )}

      {mounted &&
        menu &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: "fixed", top: menu.top, left: menu.left }}
            className="z-50 w-52 space-y-0.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-lg"
          >
            <p className="truncate px-3 pb-1 pt-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              {menu.title}
            </p>

            {!menu.isHome && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    if (menu.pinned) {
                      unpinTab(menu.href);
                    } else {
                      pinTab(menu.href);
                    }

                    setMenu(null);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                >
                  {menu.pinned ? <PinOff size={15} /> : <Pin size={15} />}
                  {menu.pinned ? "Desafixar" : "Fixar"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    closeTab(menu.href);
                    setMenu(null);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                >
                  <X size={15} />
                  Fechar
                </button>

                <div className="my-1 h-px bg-[var(--border)]" />
              </>
            )}

            <button
              type="button"
              onClick={() => {
                closeAllTabs();
                setMenu(null);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
            >
              <XCircle size={15} />
              Fechar tudo
            </button>
          </div>,
          document.body
        )}
    </div>
  );
}
