"use client";

import { FileText, Tags } from "lucide-react";

import { OsCardLink, OsShell } from "@/components";
import { useAuth } from "@/providers/AuthProvider";

export default function OsConfiguracoesFinanceiroPage() {
  const { can } = useAuth();

  const cards = [
    {
      title: "Classificações",
      description: "Cadastros de apoio do Financeiro",
      href: "/erp/financeiro/classificacoes",
      icon: Tags,
      visible: can("chart-of-account-classification.view"),
    },
    {
      title: "Plano de contas",
      description: "Cadastros de apoio do Financeiro",
      href: "/erp/financeiro/plano-contas",
      icon: FileText,
      visible: can("chart-of-account.view"),
    },
  ].filter((card) => card.visible);

  return (
    <OsShell workspaceLabel="Configurações — Financeiro">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Configurações — Financeiro
        </h1>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <OsCardLink
              key={card.href}
              title={card.title}
              description={card.description}
              href={card.href}
              icon={card.icon}
            />
          ))}
        </section>
      </div>
    </OsShell>
  );
}
