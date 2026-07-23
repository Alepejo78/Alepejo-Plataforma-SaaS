"use client";

import { useEffect, useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { SidebarHeader } from "./SidebarHeader";
import { SidebarItem } from "./SidebarItem";
import { menu } from "./menu";
import { sidebarStyles } from "./Sidebar.styles";

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

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
          className="rounded-xl p-2 hover:bg-[var(--surface-hover)]"
        >
          {collapsed ? (
            <PanelLeftOpen size={20} />
          ) : (
            <PanelLeftClose size={20} />
          )}
        </button>
      </div>

      <SidebarHeader collapsed={collapsed} />

      <nav className={sidebarStyles.navigation}>
        {menu.map((item) => (
          <SidebarItem
            key={item.id}
            item={item}
            collapsed={collapsed}
          />
        ))}
      </nav>

      <div className="border-t border-[var(--border)] p-4">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary)] text-white">
              A
            </div>

            <div>
              <p className="font-semibold text-[var(--text-primary)]">
                Alessandro
              </p>

              <p className="text-sm text-[var(--text-muted)]">
                Administrador
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}