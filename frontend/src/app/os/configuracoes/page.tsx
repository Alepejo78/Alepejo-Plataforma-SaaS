"use client";

import { Factory, Tags, UsersRound, Warehouse, Wallet } from "lucide-react";

import { OsCardLink, OsShell } from "@/components";
import { useAuth } from "@/providers/AuthProvider";

export default function OsConfiguracoesPage() {
  const { can } = useAuth();

  const cards = [
    {
      title: "Cadastro",
      description: "Categorias e marcas",
      href: "/os/configuracoes/cadastro",
      icon: Tags,
      iconAnim: "tags",
      visible: can("product-category.view"),
    },
    {
      title: "Estoque",
      description: "Depósitos",
      href: "/os/configuracoes/estoque",
      icon: Warehouse,
      iconAnim: "warehouse",
      visible: can("warehouse.view"),
    },
    {
      title: "Financeiro",
      description: "Plano de contas e classificações",
      href: "/os/configuracoes/financeiro",
      icon: Wallet,
      iconAnim: "wallet",
      visible:
        can("chart-of-account.view") ||
        can("chart-of-account-classification.view"),
    },
    {
      title: "Recursos Humanos",
      description: "Funções e cargos, setores, horários e EPI",
      href: "/os/configuracoes/rh",
      icon: UsersRound,
      iconAnim: "usersround",
      visible: can("job-function.view") || can("sector.view"),
    },
    {
      title: "Produção",
      description: "Configurações do módulo de produção",
      href: "/os/configuracoes/producao",
      icon: Factory,
      iconAnim: "factory",
      visible: can("production-settings.view"),
    },
  ].filter((card) => card.visible);

  return (
    <OsShell workspaceLabel="Configurações">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Configurações
        </h1>

        <p className="text-sm text-[var(--text-muted)]">
          Cadastros de apoio de cada módulo do ERP — categorias, plano de
          contas, depósitos e outros ajustes que não mudam no dia a dia.
        </p>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <OsCardLink
              key={card.href}
              title={card.title}
              description={card.description}
              href={card.href}
              icon={card.icon}
              iconAnim={card.iconAnim}
            />
          ))}
        </section>
      </div>
    </OsShell>
  );
}
