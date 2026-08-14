"use client";

import { ShieldCheck, Users } from "lucide-react";

import { OsCardLink, OsShell } from "@/components";
import { useAuth } from "@/providers/AuthProvider";

export default function OsSegurancaPage() {
  const { can } = useAuth();

  const cards = [
    {
      title: "Usuários",
      description: "Cadastro de usuários e vínculo com perfis",
      href: "/erp/configuracoes/usuarios",
      icon: Users,
      visible: can("user.view"),
    },
    {
      title: "Perfis de acesso",
      description: "Perfis e matriz de permissões",
      href: "/erp/configuracoes/perfis",
      icon: ShieldCheck,
      visible: can("role.view"),
    },
  ].filter((card) => card.visible);

  return (
    <OsShell workspaceLabel="Segurança">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Segurança
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
