"use client";

import { useEffect, useState } from "react";
import {
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

import { useAuth } from "@/providers/AuthProvider";
import { useMenu } from "@/hooks/useMenu";

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

  const { user, logout, loading } = useAuth();

  const menuItems = useMenu();

  useEffect(() => {
    const value = localStorage.getItem("sidebar-collapsed");

    if (value) {
      setCollapsed(value === "true");
    }
  }, []);

  function toggleSidebar() {
    const value = !collapsed;

    setCollapsed(value);

    localStorage.setItem("sidebar-collapsed", String(value));
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
      <div className="flex justify-end p-3">
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
          menuItems.map((item) => (
            <SidebarItem
              key={item.id}
              item={item}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          ))
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
