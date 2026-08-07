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

import type { MenuEntry } from "./Sidebar.types";

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
        href: "#",
        module: "SALES",
        permission: "sale.view",
        disabled: true,
      },
      {
        id: "pedidos",
        title: "Pedidos",
        icon: FileText,
        href: "#",
        module: "SALES",
        permission: "sale.view",
        disabled: true,
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
        disabled: true,
      },
      {
        id: "recebimentos",
        title: "Recebimentos",
        icon: Boxes,
        href: "#",
        module: "PURCHASE",
        permission: "purchase.view",
        disabled: true,
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
    children: [
      {
        id: "contas-receber",
        title: "Contas a receber",
        icon: Banknote,
        href: "/erp/financeiro/receber",
        disabled: true,
      },
      {
        id: "contas-pagar",
        title: "Contas a pagar",
        icon: Receipt,
        href: "/erp/financeiro/pagar",
        disabled: true,
      },
      {
        id: "fluxo-caixa",
        title: "Fluxo de caixa",
        icon: BarChart3,
        href: "/erp/financeiro/fluxo-caixa",
        disabled: true,
      },
      {
        id: "orcamento",
        title: "Orçamento",
        icon: Target,
        href: "/erp/financeiro/orcamento",
        disabled: true,
      },
      {
        id: "plano-contas",
        title: "Plano de contas",
        icon: FileText,
        href: "/erp/financeiro/plano-contas",
        disabled: true,
      },
    ],
  },

  {
    id: "rh",
    title: "Recursos Humanos",
    icon: UserCog,
    children: [
      {
        id: "colaboradores",
        title: "Colaboradores",
        icon: Users,
        href: "/erp/rh/colaboradores",
        disabled: true,
      },
      {
        id: "funcoes",
        title: "Funções e cargos",
        icon: ClipboardList,
        href: "/erp/rh/funcoes",
        disabled: true,
      },
      {
        id: "epi",
        title: "EPI",
        icon: HardHat,
        href: "/erp/rh/epi",
        disabled: true,
      },
      {
        id: "exames",
        title: "Exames médicos",
        icon: Stethoscope,
        href: "/erp/rh/exames",
        disabled: true,
      },
      {
        id: "aniversariantes",
        title: "Aniversariantes",
        icon: CalendarHeart,
        href: "/erp/rh/aniversariantes",
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

  {
    id: "sistema",
    title: "Sistema",
    icon: Settings,
    children: [
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
    ],
  },
];
