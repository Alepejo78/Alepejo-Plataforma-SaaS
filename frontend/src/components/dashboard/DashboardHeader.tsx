"use client";

import { Typography } from "@/components";

interface DashboardHeaderProps {
  userName?: string;
  companyName?: string;
  isBirthday?: boolean;
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
}: DashboardHeaderProps) {
  return (
    <header className="mb-8 space-y-2">
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
    </header>
  );
}