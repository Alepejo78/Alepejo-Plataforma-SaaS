"use client";

import { OsShell } from "@/components";
import { WhatsappSettingsTab } from "@/components/settings/WhatsappSettingsTab";

/**
 * Configuração de e-mail (SMTP por empresa) ocultada por decisão do
 * usuário (19-08-2026): a hospedagem atual (Railway, fora do plano
 * Pro) bloqueia a porta SMTP pra qualquer servidor, então o SMTP
 * customizado por empresa não funcionaria em produção mesmo
 * configurado certinho. `EmailSettingsTab` continua existindo — só
 * não é mais importado aqui — pra reativar fácil se um dia isso for
 * resolvido (upgrade de plano, ou trocar o recurso por chave de API
 * tipo Resend por empresa). Ver docs/08-Continuidade.md.
 */
export default function NotificacoesPage() {
  return (
    <OsShell workspaceLabel="Notificações">
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Notificações
        </h1>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <WhatsappSettingsTab />
        </div>
      </div>
    </OsShell>
  );
}
