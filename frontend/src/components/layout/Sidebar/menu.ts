import {
    LayoutDashboard,
    ShoppingCart,
    Warehouse,
    Package,
    Users,
    Building2,
    Settings,
  } from "lucide-react";
  
  import { MenuItem } from "./Sidebar.types";
  
  export const menu: MenuItem[] = [
    {
      id: "dashboard",
      title: "Dashboard",
      icon: LayoutDashboard,
      href: "/",
    },
    {
      id: "comercial",
      title: "Comercial",
      icon: ShoppingCart,
      href: "/comercial",
    },
    {
      id: "estoque",
      title: "Estoque",
      icon: Warehouse,
      href: "/estoque",
    },
    {
      id: "produtos",
      title: "Produtos",
      icon: Package,
      href: "/produtos",
    },
    {
      id: "clientes",
      title: "Clientes",
      icon: Users,
      href: "/clientes",
    },
    {
      id: "empresa",
      title: "Empresa",
      icon: Building2,
      href: "/empresa",
    },
    {
      id: "configuracoes",
      title: "Configurações",
      icon: Settings,
      href: "/configuracoes",
    },
  ];