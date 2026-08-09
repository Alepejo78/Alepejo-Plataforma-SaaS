import {
  Banknote,
  BarChart3,
  Boxes,
  Building2,
  CalendarHeart,
  ClipboardList,
  Factory,
  FileText,
  HardHat,
  LayoutDashboard,
  Monitor,
  Package,
  Receipt,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Stethoscope,
  Tags,
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
    id: "dashboard",
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/",
  },

  {
    id: "cadastros",
    title: "Cadastros",
    icon: Users,
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
      {
        id: "produtos-auxiliares",
        title: "Categorias e marcas",
        icon: Tags,
        href: "/erp/produtos/cadastros",
        module: "PRODUCTS",
        permission: "product-category.view",
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
        id: "depositos",
        title: "Depósitos",
        icon: Building2,
        href: "/erp/estoque/depositos",
        module: "INVENTORY",
        permission: "warehouse.view",
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
        id: "plano-contas",
        title: "Plano de contas",
        icon: FileText,
        href: "/erp/financeiro/plano-contas",
        module: "FINANCE",
        permission: "chart-of-account.view",
      },
      {
        id: "classificacoes",
        title: "Classificações",
        icon: Tags,
        href: "/erp/financeiro/classificacoes",
        module: "FINANCE",
        permission: "chart-of-account-classification.view",
      },
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
        disabled: true,
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
        id: "colaboradores",
        title: "Colaboradores",
        icon: Users,
        href: "/erp/rh/colaboradores",
        module: "HR",
        permission: "employee.view",
      },
      {
        id: "funcoes",
        title: "Funções e cargos",
        icon: ClipboardList,
        href: "/erp/rh/funcoes",
        module: "HR",
        permission: "job-function.view",
      },
      {
        id: "rh-cadastros",
        title: "Setores, horários e EPI",
        icon: Tags,
        href: "/erp/rh/cadastros",
        module: "HR",
        permission: "sector.view",
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
        disabled: true,
      },
      {
        id: "aniversariantes",
        title: "Aniversariantes",
        icon: CalendarHeart,
        href: "/erp/rh/aniversariantes",
        module: "HR",
        disabled: true,
      },
    ],
  },

  {
    id: "producao",
    title: "Produção",
    icon: Factory,
    children: [
      {
        id: "ordens-producao",
        title: "Ordens de produção",
        icon: ClipboardList,
        href: "/erp/producao/ordens",
        disabled: true,
      },
      {
        id: "acompanhamento",
        title: "Acompanhamento",
        icon: BarChart3,
        href: "/erp/producao/acompanhamento",
        disabled: true,
      },
    ],
  },
];

/**
 * Itens do antigo grupo "Sistema" — agora vivem no menu do usuário
 * (topo direito, clicando no avatar), não mais na navegação principal.
 */
export const systemMenuItems: MenuItem[] = [
  {
    id: "licenciamento",
    title: "Licenciamento",
    icon: ShieldCheck,
    href: "/erp/licenciamento",
    permission: "license.view",
  },
  {
    id: "configuracoes",
    title: "Configurações",
    icon: Settings,
    href: "/erp/configuracoes",
    permission: "company.view",
  },
  {
    id: "personalizacao",
    title: "Personalização",
    icon: Monitor,
    href: "/erp/configuracoes/personalizacao",
    permission: "company-branding.view",
  },
];
