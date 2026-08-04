"use client";

import Link from "next/link";
import { useState } from "react";

import {
  Menu,
  LayoutDashboard,
  Wallet,
  Package,
  ShoppingCart,
  Users,
  Settings,
  Moon,
  Sun,
  FileText,
  ClipboardList,
} from "lucide-react";

import { useTheme } from "next-themes";

type MenuItemProps = {
  href?: string;
  icon: React.ReactNode;
  label: string;
  collapsed: boolean;
  disabled?: boolean;
};

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  const { theme, setTheme } = useTheme();

  return (
    <div className="flex min-h-screen bg-white dark:bg-black">
      <aside
        className={`
          border-r
          transition-all
          duration-300
          ${collapsed ? "w-20" : "w-64"}
          bg-black
          text-white
        `}
      >
        <div className="flex items-center justify-between p-4">
          <button onClick={() => setCollapsed(!collapsed)}>
            <Menu />
          </button>
        </div>

        <nav className="mt-8 space-y-1">
          <MenuItem
            href="/erp/dashboard"
            icon={<LayoutDashboard size={20} />}
            label="Dashboard"
            collapsed={collapsed}
          />

          <MenuItem
            href="/comercial"
            icon={<ShoppingCart size={20} />}
            label="Comercial"
            collapsed={collapsed}
          />

          <MenuItem
            href="/erp/vendas"
            icon={<ClipboardList size={20} />}
            label="Vendas"
            collapsed={collapsed}
          />

          <MenuItem
            href="/erp/clientes"
            icon={<Users size={20} />}
            label="Clientes"
            collapsed={collapsed}
          />

          <MenuItem
            disabled
            icon={<FileText size={20} />}
            label="Orçamentos"
            collapsed={collapsed}
          />

          <MenuItem
            disabled
            icon={<FileText size={20} />}
            label="Pedidos"
            collapsed={collapsed}
          />

          <MenuItem
            href="/erp/estoque"
            icon={<Package size={20} />}
            label="Estoque"
            collapsed={collapsed}
          />

          <MenuItem
            href="/erp/financeiro"
            icon={<Wallet size={20} />}
            label="Financeiro"
            collapsed={collapsed}
          />

          <MenuItem
            href="/erp/configuracoes"
            icon={<Settings size={20} />}
            label="Configurações"
            collapsed={collapsed}
          />
        </nav>
      </aside>

      <div className="flex-1">
        <header className="flex h-16 items-center justify-end border-b px-6">
          <button
            onClick={() =>
              setTheme(theme === "dark" ? "light" : "dark")
            }
          >
            {theme === "dark" ? <Sun /> : <Moon />}
          </button>
        </header>

        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}

function MenuItem({
  href,
  icon,
  label,
  collapsed,
  disabled = false,
}: MenuItemProps) {
  const content = (
    <div
      className={`flex items-center gap-3 px-4 py-3 transition
      ${
        disabled
          ? "cursor-not-allowed opacity-40"
          : "cursor-pointer hover:bg-zinc-900"
      }`}
    >
      {icon}
      {!collapsed && <span>{label}</span>}
    </div>
  );

  if (disabled) {
    return content;
  }

  return <Link href={href ?? "#"}>{content}</Link>;
}