"use client";

import { Tags } from "lucide-react";

import { OsCardLink, OsShell } from "@/components";
import { useAuth } from "@/providers/AuthProvider";

export default function OsConfiguracoesCadastroPage() {
  const { can } = useAuth();

  const cards = [
    {
      title: "Categorias e marcas",
      description: "Cadastros de apoio de Produtos",
      href: "/erp/produtos/cadastros",
      icon: Tags,
      iconAnim: "tags",
      visible: can("product-category.view"),
    },
  ].filter((card) => card.visible);

  return (
    <OsShell workspaceLabel="Configurações — Cadastro">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Configurações — Cadastro
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
