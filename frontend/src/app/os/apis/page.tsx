"use client";

import { KeyRound, MessageCircle } from "lucide-react";

import { OsCardLink, OsShell } from "@/components";
import { useAuth } from "@/providers/AuthProvider";

export default function OsApisPage() {
  const { can, hasModule } = useAuth();

  const cards = [
    {
      title: "WhatsApp e E-mail",
      description: "Sessão do WhatsApp e servidor de e-mail (SMTP)",
      href: "/erp/configuracoes/notificacoes",
      icon: MessageCircle,
      visible: can("whatsapp.view") || can("email.view"),
    },
    {
      title: "Chave de API (relógio de ponto)",
      description: "Chave usada por dispositivos externos pra bater ponto",
      href: "/erp/rh/ponto/chave-api",
      icon: KeyRound,
      visible: hasModule("LABOR") && can("time-clock.manage-api-key"),
    },
  ].filter((card) => card.visible);

  return (
    <OsShell workspaceLabel="APIs">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          APIs
        </h1>

        <p className="text-sm text-[var(--text-muted)]">
          Integrações do sistema com serviços externos. Qualquer API nova
          que o sistema ganhar entra aqui.
        </p>

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
