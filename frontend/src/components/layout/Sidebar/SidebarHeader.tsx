"use client";

import { Search } from "lucide-react";

import { Brand } from "../Brand/Brand";

interface SidebarHeaderProps {
  collapsed: boolean;
}

export function SidebarHeader({
  collapsed,
}: SidebarHeaderProps) {
  return (
    <div
      className={`
        border-b
        border-[var(--border)]
        transition-all
        duration-300
        ${collapsed ? "px-2 py-4" : "p-6"}
      `}
    >
      <div
        className={`
          flex
          transition-all
          duration-300
          ${collapsed ? "justify-center" : "justify-start"}
        `}
      >
        <Brand collapsed={collapsed} />
      </div>

      {!collapsed && (
        <div className="relative mt-6">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
          />

          <input
            type="text"
            placeholder="Pesquisar..."
            className="
              h-11
              w-full
              rounded-xl
              border
              border-[var(--border)]
              bg-[var(--surface)]
              pl-10
              pr-3
              text-sm
              outline-none
              transition-all
              focus:border-[var(--primary)]
            "
          />
        </div>
      )}
    </div>
  );
}