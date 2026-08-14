"use client";

import {
  BadgeCheck,
  Building2,
  Compass,
  Monitor,
  Plug,
  Settings,
  ShieldCheck,
} from "lucide-react";

import { OsCardLink, OsShell } from "@/components";
import { useAuth } from "@/providers/AuthProvider";

export default function OsHomePage() {
  const { can, hasModule } = useAuth();

  const cards = [
    {
      title: "Portal",
      description: "Painel inicial do app OS",
      href: "/os/portal",
      icon: Compass,
      visible: true,
      comingSoon: true,
    },
    {
      title: "Segurança",
      description: "Usuários e perfis de acesso",
      href: "/os/seguranca",
      icon: ShieldCheck,
      visible: can("user.view") || can("role.view"),
    },
    {
      title: "APIs",
      description: "WhatsApp, e-mail e chave do relógio de ponto",
      href: "/os/apis",
      icon: Plug,
      visible:
        can("whatsapp.view") ||
        can("email.view") ||
        (hasModule("LABOR") && can("time-clock.manage-api-key")),
    },
    {
      title: "Empresa",
      description: "Dados da empresa",
      href: "/erp/configuracoes",
      icon: Building2,
      visible: can("company.view"),
    },
    {
      title: "Configurações",
      description: "Cadastros de apoio de cada módulo",
      href: "/os/configuracoes",
      icon: Settings,
      visible:
        can("product-category.view") ||
        can("warehouse.view") ||
        can("chart-of-account.view") ||
        can("chart-of-account-classification.view") ||
        can("job-function.view") ||
        can("sector.view") ||
        can("production-settings.view"),
    },
    {
      title: "Personalização",
      description: "Marca, logo e layout do sistema",
      href: "/erp/configuracoes/personalizacao",
      icon: Monitor,
      visible: can("company-branding.view"),
    },
    {
      title: "Licenciamento",
      description: "Plano, módulos e empresas do grupo",
      href: "/erp/licenciamento",
      icon: BadgeCheck,
      visible: can("license.view"),
    },
  ].filter((card) => card.visible);

  return (
    <OsShell workspaceLabel="OS">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            OS
          </h1>

          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Administração do sistema — segurança, integrações,
            configurações e licenciamento.
          </p>
        </div>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <OsCardLink
              key={card.href}
              title={card.title}
              description={card.description}
              href={card.href}
              icon={card.icon}
              comingSoon={card.comingSoon}
            />
          ))}
        </section>
      </div>
    </OsShell>
  );
}
