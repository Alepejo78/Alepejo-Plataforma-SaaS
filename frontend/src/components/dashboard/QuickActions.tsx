"use client";

import {
  Building2,
  ClipboardList,
  CreditCard,
  Package,
  Receipt,
  ShoppingCart,
  UserPlus,
  BarChart3,
} from "lucide-react";

import { QuickAction } from "./QuickAction";

const actions = [
  {
    title: "Novo Cliente",
    description: "Cadastrar um novo cliente",
    icon: <UserPlus size={22} />,
    href: "/erp/clientes/novo",
  },
  {
    title: "Novo Produto",
    description: "Cadastrar um novo produto",
    icon: <Package size={22} />,
    href: "/erp/produtos/novo",
  },
  {
    title: "Nova Venda",
    description: "Iniciar uma nova venda",
    icon: <ShoppingCart size={22} />,
    href: "/erp/comercial/vendas/nova",
  },
  {
    title: "Novo Pedido",
    description: "Criar um novo pedido",
    icon: <ClipboardList size={22} />,
    href: "/erp/comercial/pedidos/novo",
  },
  {
    title: "Contas a Receber",
    description: "Consultar recebimentos",
    icon: <Receipt size={22} />,
    href: "/erp/financeiro/receber",
  },
  {
    title: "Contas a Pagar",
    description: "Consultar pagamentos",
    icon: <CreditCard size={22} />,
    href: "/erp/financeiro/pagar",
  },
  {
    title: "Estoque",
    description: "Consultar estoque",
    icon: <Building2 size={22} />,
    href: "/erp/estoque",
  },
  {
    title: "Relatórios",
    description: "Visualizar indicadores",
    icon: <BarChart3 size={22} />,
    href: "/erp/relatorios",
  },
];

export function QuickActions() {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">
          Ações Rápidas
        </h2>

        <p className="text-sm text-[var(--text-muted)]">
          Acesse rapidamente as principais funcionalidades do sistema.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {actions.map((action) => (
          <QuickAction
            key={action.title}
            title={action.title}
            description={action.description}
            icon={action.icon}
            href={action.href}
          />
        ))}
      </div>
    </section>
  );
}