"use client";

import { Settings } from "lucide-react";

import { OsCardLink, OsShell } from "@/components";
import { useAuth } from "@/providers/AuthProvider";

export default function OsConfiguracoesProducaoPage() {
  const { can } = useAuth();

  const cards = [
    {
      title: "Configurações",
      description: "Cadastros de apoio de Produção",
      href: "/erp/producao/configuracoes",
      icon: Settings,
      iconAnim: "settings",
      visible: can("production-settings.view"),
    },
  ].filter((card) => card.visible);

  return (
    <OsShell workspaceLabel="Configurações — Produção">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Configurações — Produção
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
