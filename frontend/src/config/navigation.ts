import {
  LayoutDashboard,
  Package,
  Settings,
  ShoppingCart,
  Wallet,
} from "lucide-react";

import type { SidebarNavigationItem } from "@/components/layout/Sidebar";

export const primaryNavigation: readonly SidebarNavigationItem[] = [
  { href: "/erp/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/comercial", icon: ShoppingCart, label: "Comercial" },
  { href: "/erp/estoque", icon: Package, label: "Estoque" },
  { href: "/erp/financeiro", icon: Wallet, label: "Financeiro" },
  { href: "/erp/configuracoes", icon: Settings, label: "Configurações" },
];
