"use client";

import { Bell, RefreshCw } from "lucide-react";

import { Button, Typography } from "@/components";

interface DashboardHeaderProps {
  userName?: string;
  companyName?: string;
  isBirthday?: boolean;
  onRefresh?: () => void;
  onNotifications?: () => void;
}

function getGreeting(): string {
  const hour = new Date().getHours();

  if (hour >= 6 && hour < 12) return "Bom dia";
  if (hour >= 12 && hour < 18) return "Boa tarde";

  return "Boa noite";
}

function getCurrentDate(): string {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

export function DashboardHeader({
  userName,
  companyName,
  isBirthday,
  onRefresh,
  onNotifications,
}: DashboardHeaderProps) {
  return (
    <header className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
      <div className="space-y-2">
        <Typography variant="h1">
          {getGreeting()}
          {userName ? `, ${userName}` : ""} 👋
        </Typography>

        {isBirthday && (
          <Typography
            variant="body"
            className="font-medium text-[var(--primary)]"
          >
            🎉 Desejando um feliz aniversário pra você!
          </Typography>
        )}

        <Typography variant="body">
          {companyName ?? "Bem-vindo ao AlePejo ERP Cloud."}
        </Typography>

        <Typography
          variant="caption"
          className="capitalize text-[var(--text-muted)]"
        >
          {getCurrentDate()}
        </Typography>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          onClick={onRefresh}
          className="
            border-[var(--border-strong)]
            bg-[var(--surface-active)]
            text-[var(--text-secondary)]
            hover:bg-[var(--surface-hover)]
            hover:border-[var(--primary)]
            hover:text-[var(--text-primary)]
            shadow-sm
          "
        >
          <RefreshCw
            size={18}
            className="text-[var(--text-secondary)]"
          />

          <span>Atualizar</span>
        </Button>

        <Button
          variant="outline"
          onClick={onNotifications}
          className="
            border-[var(--border-strong)]
            bg-[var(--surface-active)]
            text-[var(--text-secondary)]
            hover:bg-[var(--surface-hover)]
            hover:border-[var(--primary)]
            hover:text-[var(--text-primary)]
            shadow-sm
          "
        >
          <Bell
            size={18}
            className="text-[var(--text-secondary)]"
          />

          <span>Notificações</span>
        </Button>
      </div>
    </header>
  );
}