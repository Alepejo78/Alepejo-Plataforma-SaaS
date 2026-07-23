import {
    LayoutDashboard,
    Package,
    Factory,
    Wallet,
    Users,
    FileText,
    Settings,
  } from "lucide-react";
  
  export const menuItems = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Cadastros",
      href: "/cadastros",
      icon: Package,
    },
    {
      title: "Produção",
      href: "/producao",
      icon: Factory,
    },
    {
      title: "Financeiro",
      href: "/financeiro",
      icon: Wallet,
    },
    {
      title: "Comercial",
      href: "/comercial",
      icon: Users,
    },
    {
      title: "Relatórios",
      href: "/relatorios",
      icon: FileText,
    },
    {
      title: "Configurações",
      href: "/configuracoes",
      icon: Settings,
    },
  ];