"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Clock, Lock } from "lucide-react";

import { useAuth } from "@/providers/AuthProvider";
import { licenseService, type MyLicense } from "@/services/license.service";

function daysUntil(dateStr: string): number {
  const diffMs = new Date(dateStr).getTime() - Date.now();

  return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
}

/**
 * Aviso de estado da assinatura (teste acabando, pagamento pendente,
 * bloqueado) — mostrado em toda tela autenticada (ERP e OS). Busca
 * `/identity/license/me` direto (não passa pelo `/auth/me` — mudar o
 * payload da sessão pra isso afetaria o JWT e o guard de toda rota, e
 * este aviso não precisa disso).
 *
 * Fica em silêncio (sem "piscar" um aviso à toa) até saber o estado de
 * verdade — só decide o que mostrar depois que a chamada volta.
 */
export function SubscriptionBanner() {
  const { user } = useAuth();
  const [license, setLicense] = useState<MyLicense | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }

    let active = true;

    licenseService
      .me()
      .then((data) => {
        if (active) {
          setLicense(data);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [user]);

  const plan = license?.companyPlan;

  if (!plan) {
    return null;
  }

  if (plan.status === "BLOCKED") {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--danger)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
        <span className="flex items-center gap-2 font-medium">
          <Lock size={16} />
          Acesso bloqueado por falta de pagamento — os dados continuam
          seguros, só o acesso aos módulos foi pausado.
        </span>

        <Link
          href="/erp/licenciamento"
          className="whitespace-nowrap rounded-lg bg-[var(--danger)] px-3 py-1.5 font-semibold text-white transition-opacity hover:opacity-90"
        >
          Regularizar
        </Link>
      </div>
    );
  }

  if (plan.status === "PAST_DUE") {
    const graceLabel = plan.graceUntil
      ? new Date(plan.graceUntil).toLocaleDateString("pt-BR")
      : null;

    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--warning)] bg-[var(--warning-soft)] px-4 py-3 text-sm text-[var(--warning)]">
        <span className="flex items-center gap-2 font-medium">
          <AlertTriangle size={16} />
          Pagamento pendente
          {graceLabel && ` — regularize até ${graceLabel} pra não perder o acesso`}
          .
        </span>

        <Link
          href="/erp/licenciamento"
          className="whitespace-nowrap rounded-lg bg-[var(--warning)] px-3 py-1.5 font-semibold text-white transition-opacity hover:opacity-90"
        >
          Ver detalhes
        </Link>
      </div>
    );
  }

  if (plan.status === "TRIAL" && plan.trialEndsAt) {
    const days = daysUntil(plan.trialEndsAt);

    if (days > 7) {
      return null;
    }

    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-hover)] px-4 py-3 text-sm text-[var(--text-secondary)]">
        <span className="flex items-center gap-2">
          <Clock size={16} />
          {days > 0
            ? `Seu período de teste termina em ${days} dia(s).`
            : "Seu período de teste terminou."}
        </span>

        <Link
          href="/erp/licenciamento"
          className="whitespace-nowrap rounded-lg bg-[var(--primary)] px-3 py-1.5 font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)]"
        >
          Contratar
        </Link>
      </div>
    );
  }

  return null;
}
