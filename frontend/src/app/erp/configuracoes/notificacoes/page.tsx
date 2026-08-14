"use client";

import { useState } from "react";
import { Mail, MessageCircle } from "lucide-react";

import { OsShell } from "@/components";
import { EmailSettingsTab } from "@/components/settings/EmailSettingsTab";
import { WhatsappSettingsTab } from "@/components/settings/WhatsappSettingsTab";

type TabKey = "email" | "whatsapp";

const TABS: { key: TabKey; label: string; icon: typeof Mail }[] = [
  { key: "email", label: "Configuração E-mail", icon: Mail },
  {
    key: "whatsapp",
    label: "Configuração WhatsApp",
    icon: MessageCircle,
  },
];

export default function NotificacoesPage() {
  const [tab, setTab] = useState<TabKey>("email");

  return (
    <OsShell workspaceLabel="Notificações">
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Notificações
        </h1>

        <div className="flex gap-2 border-b border-[var(--border)]">
          {TABS.map((item) => {
            const Icon = item.icon;
            const active = tab === item.key;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={`
                  flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors
                  ${
                    active
                      ? "border-[var(--primary)] text-[var(--primary-text)]"
                      : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }
                `}
              >
                <Icon size={16} />
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          {tab === "email" ? (
            <EmailSettingsTab />
          ) : (
            <WhatsappSettingsTab />
          )}
        </div>
      </div>
    </OsShell>
  );
}
