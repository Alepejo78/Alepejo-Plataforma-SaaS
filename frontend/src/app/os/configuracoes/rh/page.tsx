"use client";

import { ClipboardList, Tags } from "lucide-react";

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
      visible: can("job-function.view"),
    },
    {
      title: "Setores, horários e EPI",
      description: "Cadastros de apoio de Recursos Humanos",
      href: "/erp/rh/cadastros",
      icon: Tags,
      visible: can("sector.view"),
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
            />
          ))}
        </section>
      </div>
    </OsShell>
  );
}
