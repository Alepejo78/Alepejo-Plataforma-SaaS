import {
  Banknote,
  BarChart3,
  Boxes,
  CalendarHeart,
  CalendarX,
  Clock,
  ClipboardList,
  Factory,
  FileText,
  HardHat,
  LayoutDashboard,
  Monitor,
  Package,
  Receipt,
  ShoppingCart,
  Stethoscope,
  Tag,
  Target,
  Truck,
  UserCog,
  Users,
  Wallet,
  Warehouse,
} from "lucide-react";

import type { MenuEntry, MenuItem } from "./Sidebar.types";

/**
 * Menu do sistema, organizado por módulo.
 *
 * A visibilidade é resolvida em tempo de execução pelo hook useMenu,
 * cruzando `module` (licença da empresa) e `permission` (RBAC do usuário).
 * Um grupo some do menu quando nenhum de seus filhos é visível.
 *
 * Itens com `disabled: true` ainda não foram implementados: aparecem
 * como "em breve" para mostrar o caminho do produto sem levar a 404.
 */
export const menu: MenuEntry[] = [
  {
    id: "visao-geral",
    title: "Visão geral",
    icon: LayoutDashboard,
    href: "/",
  },

  {
    id: "cadastros",
    title: "Cadastros",
    icon: Users,
    section: "interprise",
    children: [
      {
        id: "parceiros",
        title: "Parceiros",
        icon: Users,
        href: "/erp/parceiros",
        module: "BPS",
        permission: "partner.view",
      },
      {
        id: "produtos",
        title: "Produtos",
        icon: Package,
        href: "/erp/produtos",
        module: "PRODUCTS",
        permission: "product.view",
      },
    ],
  },

  {
    id: "colaboradores-interprise",
    title: "Colaboradores",
    icon: UserCog,
    module: "HR",
    section: "interprise",
    children: [
      {
        id: "cadastro-colaboradores-interprise",
        title: "Cadastro de colaboradores",
        icon: Users,
        href: "/erp/rh/colaboradores",
        module: "HR",
        permission: "employee.view",
      },
    ],
  },

  {
    id: "compras",
    title: "Compras",
    icon: Truck,
    module: "PURCHASE",
    children: [
      {
        id: "compras-lista",
        title: "Compras",
        icon: Truck,
        href: "/erp/compras",
        module: "PURCHASE",
        permission: "purchase.view",
      },
      {
        id: "cotacoes",
        title: "Cotações",
        icon: FileText,
        href: "/erp/compras/cotacoes",
        module: "PURCHASE",
        permission: "quotation.view",
      },
      {
        id: "pedidos-compra",
        title: "Pedidos",
        icon: FileText,
        href: "/erp/compras/pedidos",
        module: "PURCHASE",
        permission: "purchase-order.view",
      },
      {
        id: "recebimentos",
        title: "Recebimentos",
        icon: Boxes,
        href: "/erp/compras/recebimento",
        module: "PURCHASE",
        permission: "purchase.receive",
      },
    ],
  },

  {
    id: "comercial",
    title: "Comercial",
    icon: ShoppingCart,
    module: "SALES",
    children: [
      {
        id: "vendas",
        title: "Vendas",
        icon: ClipboardList,
        href: "/erp/vendas",
        module: "SALES",
        permission: "sale.view",
      },
      {
        id: "orcamentos",
        title: "Orçamentos",
        icon: FileText,
        href: "/erp/vendas/orcamentos",
        module: "SALES",
        permission: "quote.view",
      },
      {
        id: "pedidos",
        title: "Pedidos",
        icon: FileText,
        href: "/erp/vendas/pedidos",
        module: "SALES",
        permission: "sales-order.view",
      },
    ],
  },

  {
    id: "estoque",
    title: "Estoque",
    icon: Warehouse,
    module: "INVENTORY",
    children: [
      {
        id: "estoque-saldo",
        title: "Saldo em estoque",
        icon: Boxes,
        href: "/erp/estoque",
        module: "INVENTORY",
        permission: "inventory.view",
      },
      {
        id: "movimentacoes",
        title: "Movimentações",
        icon: ClipboardList,
        href: "/erp/estoque/movimentacoes",
        module: "INVENTORY",
        permission: "stock-movement.view",
      },
    ],
  },

  {
    id: "financeiro",
    title: "Financeiro",
    icon: Wallet,
    module: "FINANCE",
    children: [
      {
        id: "contas-receber",
        title: "Contas a receber",
        icon: Banknote,
        href: "/erp/financeiro/receber",
        module: "FINANCE",
        permission: "financial-entry.view",
      },
      {
        id: "contas-pagar",
        title: "Contas a pagar",
        icon: Receipt,
        href: "/erp/financeiro/pagar",
        module: "FINANCE",
        permission: "financial-entry.view",
      },
      {
        id: "fluxo-caixa",
        title: "Fluxo de caixa",
        icon: BarChart3,
        href: "/erp/financeiro/fluxo-caixa",
        module: "FINANCE",
        permission: "financial-entry.view",
      },
      {
        id: "orcamento",
        title: "Orçamento",
        icon: Target,
        href: "/erp/financeiro/orcamento",
        module: "FINANCE",
        permission: "budget.view",
      },
    ],
  },

  {
    id: "rh",
    title: "Recursos Humanos",
    icon: UserCog,
    module: "HR",
    children: [
      {
        id: "beneficios",
        title: "Benefícios",
        icon: Wallet,
        href: "/erp/rh/beneficios",
        module: "HR",
        permission: "benefit.view",
      },
      {
        id: "epi",
        title: "Ficha de EPI",
        icon: HardHat,
        href: "/erp/rh/epi",
        module: "HR",
        permission: "ppe-delivery.view",
      },
      {
        id: "exames",
        title: "Exames médicos",
        icon: Stethoscope,
        href: "/erp/rh/exames",
        module: "HR",
        permission: "employee.view",
      },
      {
        id: "aniversariantes",
        title: "Aniversariantes",
        icon: CalendarHeart,
        href: "/erp/rh/aniversariantes",
        module: "HR",
        permission: "employee.view",
      },
      {
        id: "etiquetas-ctps",
        title: "Etiquetas CTPS",
        icon: Tag,
        href: "/erp/rh/etiquetas-ctps",
        module: "HR",
        permission: "employee.view",
      },
      {
        id: "indicadores-rh",
        title: "Indicadores",
        icon: BarChart3,
        href: "/erp/rh/indicadores",
        module: "HR",
        permission: "employee.view",
      },
      {
        id: "controle-ponto",
        title: "Controle de ponto",
        icon: Clock,
        href: "/erp/rh/ponto",
        module: "LABOR",
        permission: "time-entry.view",
      },
      {
        id: "acompanhamento-horas",
        title: "Acompanhamento de horas",
        icon: BarChart3,
        href: "/erp/rh/ponto/acompanhamento",
        module: "LABOR",
        permission: "time-entry.view",
      },
      {
        id: "faltas-abonos",
        title: "Faltas e abonos",
        icon: CalendarX,
        href: "/erp/rh/faltas",
        module: "LABOR",
        permission: "absence-record.view",
      },
    ],
  },

  {
    id: "producao",
    title: "Produção",
    icon: Factory,
    module: "PRODUCTION",
    children: [
      {
        id: "ordens-producao",
        title: "Ordens de produção",
        icon: ClipboardList,
        href: "/erp/producao/ordens",
        module: "PRODUCTION",
        permission: "production-order.view",
      },
      {
        id: "acompanhamento",
        title: "Acompanhamento",
        icon: BarChart3,
        href: "/erp/producao/acompanhamento",
        module: "PRODUCTION",
        permission: "production-order.view",
      },
    ],
  },

  {
    id: "dashboard",
    title: "Dashboard",
    icon: LayoutDashboard,
    children: [
      {
        id: "dashboard-graficos-colaboradores",
        title: "Gráficos colaboradores",
        icon: BarChart3,
        href: "/erp/rh/graficos-colaboradores",
        module: "HR",
        permission: "employee.view",
      },
      {
        id: "dashboard-graficos-fluxo-caixa",
        title: "Gráficos fluxo de caixa",
        icon: BarChart3,
        href: "/erp/financeiro/graficos-fluxo-caixa",
        module: "FINANCE",
        permission: "financial-entry.view",
      },
    ],
  },

  {
    id: "relatorios",
    title: "Relatórios",
    icon: FileText,
    children: [
      {
        id: "relatorio-produtos",
        title: "Produtos",
        icon: Package,
        href: "/erp/produtos/relatorio",
        module: "PRODUCTS",
        permission: "product.report",
      },
      {
        id: "relatorio-funcoes",
        title: "Funções",
        icon: ClipboardList,
        href: "/erp/rh/funcoes/relatorio",
        module: "HR",
        permission: "employee.report",
      },
      {
        id: "relatorio-parceiros",
        title: "Parceiros",
        icon: Users,
        href: "/erp/parceiros/relatorio",
        module: "BPS",
        permission: "partner.report",
      },
      {
        id: "relatorio-compras",
        title: "Compras",
        icon: Truck,
        href: "/erp/compras/relatorio",
        module: "PURCHASE",
        permission: "purchase.report",
      },
      {
        id: "relatorio-recebimentos",
        title: "Recebimentos",
        icon: Boxes,
        href: "/erp/compras/recebimento/relatorio",
        module: "PURCHASE",
        permission: "purchase.report",
      },
      {
        id: "relatorio-pedidos-compra",
        title: "Pedidos de compra",
        icon: FileText,
        href: "/erp/compras/pedidos/relatorio",
        module: "PURCHASE",
        permission: "purchase.report",
      },
      {
        id: "relatorio-cotacoes",
        title: "Cotações",
        icon: FileText,
        href: "/erp/compras/cotacoes/relatorio",
        module: "PURCHASE",
        permission: "purchase.report",
      },
      {
        id: "relatorio-pedidos-venda",
        title: "Pedidos de venda",
        icon: FileText,
        href: "/erp/vendas/pedidos/relatorio",
        module: "SALES",
        permission: "sale.report",
      },
      {
        id: "relatorio-orcamentos",
        title: "Orçamentos",
        icon: FileText,
        href: "/erp/vendas/orcamentos/relatorio",
        module: "SALES",
        permission: "sale.report",
      },
      {
        id: "relatorio-contas-receber",
        title: "Contas a receber",
        icon: Banknote,
        href: "/erp/financeiro/contas/relatorio?type=RECEIVABLE",
        module: "FINANCE",
        permission: "financial-entry.report",
      },
      {
        id: "relatorio-contas-pagar",
        title: "Contas a pagar",
        icon: Receipt,
        href: "/erp/financeiro/contas/relatorio?type=PAYABLE",
        module: "FINANCE",
        permission: "financial-entry.report",
      },
      {
        id: "relatorio-exames",
        title: "Exames",
        icon: Stethoscope,
        href: "/erp/rh/exames/relatorio",
        module: "HR",
        permission: "employee.report",
      },
      {
        id: "relatorio-aniversariantes",
        title: "Aniversariantes",
        icon: CalendarHeart,
        href: "/erp/rh/aniversariantes/relatorio",
        module: "HR",
        permission: "employee.report",
      },
    ],
  },
];

/**
 * Itens que ainda ficam no menu do usuário (topo direito, avatar) mesmo
 * depois da reorganização em OS: Personalização é o único item
 * duplicado (também vira card em OS) e Ponto-Manual é de uso pessoal do
 * dia a dia, fica só aqui. Usuários/Perfis/Licenciamento/Configurações/
 * Notificações saíram — moraram só dentro do app OS agora
 * (ver frontend/src/app/os/**).
 */
export const systemMenuItems: MenuItem[] = [
  {
    id: "personalizacao",
    title: "Personalização",
    icon: Monitor,
    href: "/erp/configuracoes/personalizacao",
    permission: "company-branding.view",
  },
  {
    id: "ponto-manual",
    title: "Ponto - Manual",
    icon: Clock,
    href: "/erp/ponto-manual",
    module: "LABOR",
    permission: "time-entry.create",
  },
];
