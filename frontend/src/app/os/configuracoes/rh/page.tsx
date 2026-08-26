"use client";

import { ClipboardList, Percent, Tags, Wallet } from "lucide-react";

import { OsCardLink, OsShell } from "@/components";
import { useAuth } from "@/providers/AuthProvider";

export default function OsConfiguracoesRhPage() {
  const { can } = useAuth();

  const cards = [
    {
      title: "Funções e cargos",
      description: "Cadastros de apoio de Recursos Humanos",
      href: "/erp/rh/funcoes",
      icon: ClipboardList,
      iconAnim: "clipboard",
      visible: can("job-function.view"),
    },
    {
      title: "Setores, horários e EPI",
      description: "Cadastros de apoio de Recursos Humanos",
      href: "/erp/rh/cadastros",
      icon: Tags,
      iconAnim: "tags",
      visible: can("sector.view"),
    },
    {
      title: "Benefícios",
      description: "Cadastro de apoio de Recursos Humanos",
      href: "/erp/rh/beneficios",
      icon: Wallet,
      iconAnim: "wallet",
      visible: can("benefit.view"),
    },
    {
      title: "Parâmetros fiscais (INSS/IRRF/FGTS)",
      description: "Tabelas da Folha de Pagamento, por vigência",
      href: "/erp/rh/parametros-fiscais",
      icon: Percent,
      iconAnim: "percent",
      visible: can("payroll-tax-table.view"),
    },
  ].filter((card) => card.visible);

  return (
    <OsShell workspaceLabel="Configurações — RH">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Configurações — Recursos Humanos
        </h1>

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
