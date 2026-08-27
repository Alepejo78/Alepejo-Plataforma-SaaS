"use client";

import { useEffect, useState } from "react";
import {
  ChevronDown,
  Eye,
  EyeOff,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

import { useAuth } from "@/providers/AuthProvider";
import { useMenu } from "@/hooks/useMenu";
import { useShowLockedModules } from "@/hooks/useShowLockedModules";

import { SidebarItem } from "./SidebarItem";
import { sidebarStyles } from "./Sidebar.styles";

function getInitials(name?: string) {
  if (!name) {
    return "?";
  }

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

export function Sidebar({
  onNavigate,
}: {
  /** Chamado depois de uma navegação bem-sucedida — fecha o overlay do menu. */
  onNavigate?: () => void;
} = {}) {
  const [collapsed, setCollapsed] = useState(false);

  // Seções "Interprise"/"Empresa" começam ocultas — clicar no rótulo
  // expande/recolhe, deixa o menu mais limpo (pedido do usuário).
  const [openSections, setOpenSections] = useState<{
    interprise: boolean;
    empresa: boolean;
  }>({ interprise: false, empresa: false });

  const { user, logout, loading } = useAuth();
  const [showLocked, setShowLocked] = useShowLockedModules();

  const menuItems = useMenu();

  const interpriseItems = menuItems.filter(
    (item) => item.section === "interprise"
  );

  const empresaItems = menuItems.filter(
    (item) => item.section !== "interprise"
  );

  useEffect(() => {
    const value = localStorage.getItem("sidebar-collapsed");

    if (value) {
      setCollapsed(value === "true");
    }

    const storedSections = localStorage.getItem(
      "sidebar-open-sections"
    );

    if (storedSections) {
      try {
        setOpenSections(JSON.parse(storedSections));
      } catch {
        // Valor corrompido — mantém o padrão (ambas ocultas).
      }
    }
  }, []);

  function toggleSidebar() {
    const value = !collapsed;

    setCollapsed(value);

    localStorage.setItem("sidebar-collapsed", String(value));
  }

  function toggleSection(section: "interprise" | "empresa") {
    setOpenSections((previous) => {
      const next = {
        ...previous,
        [section]: !previous[section],
      };

      localStorage.setItem(
        "sidebar-open-sections",
        JSON.stringify(next)
      );

      return next;
    });
  }

  return (
    <aside
      className={`
        ${sidebarStyles.root}
        transition-all
        duration-300
        ${collapsed ? "w-[72px]" : "w-72"}
      `}
    >
      <div className="flex justify-end gap-1.5 p-3">
        {!collapsed && (
          <button
            onClick={() => setShowLocked(!showLocked)}
            aria-label={
              showLocked
                ? "Ocultar módulos bloqueados"
                : "Mostrar módulos bloqueados"
            }
            title={
              showLocked
                ? "Ocultar módulos bloqueados"
                : "Mostrar módulos bloqueados"
            }
            className={`${sidebarStyles.iconButton} size-9`}
          >
            {showLocked ? (
              <Eye size={18} />
            ) : (
              <EyeOff size={18} />
            )}
          </button>
        )}

        <button
          onClick={toggleSidebar}
          aria-label={
            collapsed ? "Expandir menu" : "Recolher menu"
          }
          className={`${sidebarStyles.iconButton} size-9`}
        >
          {collapsed ? (
            <PanelLeftOpen size={20} />
          ) : (
            <PanelLeftClose size={20} />
          )}
        </button>
      </div>

      <nav className={`${sidebarStyles.navigation} mt-1`}>
        {loading ? (
          <div className="space-y-2 px-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-10 animate-pulse rounded-xl bg-[var(--surface-hover)]"
              />
            ))}
          </div>
        ) : (
          <>
            {interpriseItems.length > 0 && (
              <>
                {collapsed ? (
                  interpriseItems.map((item) => (
                    <SidebarItem
                      key={item.id}
                      item={item}
                      collapsed={collapsed}
                      onNavigate={onNavigate}
                    />
                  ))
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => toggleSection("interprise")}
                      aria-expanded={openSections.interprise}
                      className="flex w-full items-center justify-between px-4 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)]"
                    >
                      Interprise

                      <ChevronDown
                        size={14}
                        className={`shrink-0 transition-transform duration-200 ${
                          openSections.interprise
                            ? "rotate-180"
                            : ""
                        }`}
                      />
                    </button>

                    {openSections.interprise &&
                      interpriseItems.map((item) => (
                        <SidebarItem
                          key={item.id}
                          item={item}
                          collapsed={collapsed}
                          onNavigate={onNavigate}
                        />
                      ))}
                  </>
                )}

                <div className="my-2 border-t border-[var(--border)]" />
              </>
            )}

            {empresaItems.length > 0 &&
              (collapsed ? (
                empresaItems.map((item) => (
                  <SidebarItem
                    key={item.id}
                    item={item}
                    collapsed={collapsed}
                    onNavigate={onNavigate}
                  />
                ))
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => toggleSection("empresa")}
                    aria-expanded={openSections.empresa}
                    className="flex w-full items-center justify-between px-4 pb-1 pt-1 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)]"
                  >
                    Empresa

                    <ChevronDown
                      size={14}
                      className={`shrink-0 transition-transform duration-200 ${
                        openSections.empresa ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {openSections.empresa &&
                    empresaItems.map((item) => (
                      <SidebarItem
                        key={item.id}
                        item={item}
                        collapsed={collapsed}
                        onNavigate={onNavigate}
                      />
                    ))}
                </>
              ))}
          </>
        )}
      </nav>

      <div className="border-t border-[var(--border)] p-4">
        {collapsed ? (
          <button
            onClick={() => void logout()}
            title="Sair"
            aria-label="Sair"
            className={`${sidebarStyles.iconButton} h-9 w-full`}
          >
            <LogOut size={20} />
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-white">
              {getInitials(user?.name)}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-[var(--text-primary)]">
                {user?.name ?? "—"}
              </p>

              <p className="truncate text-sm text-[var(--text-secondary)]">
                {user?.company?.tradeName ?? ""}
              </p>
            </div>

            <button
              onClick={() => void logout()}
              title="Sair"
              aria-label="Sair"
              className={`${sidebarStyles.iconButton} size-9 shrink-0`}
            >
              <LogOut size={18} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
