"use client";

import { Building2 } from "lucide-react";

import { OsCardLink, OsShell } from "@/components";
import { useAuth } from "@/providers/AuthProvider";

export default function OsConfiguracoesEstoquePage() {
  const { can } = useAuth();

  const cards = [
    {
      title: "Depósitos",
      description: "Cadastros de apoio de Estoque",
      href: "/erp/estoque/depositos",
      icon: Building2,
      iconAnim: "building2",
      visible: can("warehouse.view"),
    },
  ].filter((card) => card.visible);

  return (
    <OsShell workspaceLabel="Configurações — Estoque">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Configurações — Estoque
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
