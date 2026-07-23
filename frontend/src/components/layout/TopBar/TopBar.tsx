"use client";

import { Menu, X } from "lucide-react";

import { cn } from "@/lib";

import { topBarStyles } from "./TopBar.styles";
import type { TopBarProps } from "./TopBar.types";

function getInitials(name?: string) {
  if (!name) {
    return "?";
  }

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

export function TopBar({
  companyName,
  isMobileNavigationOpen,
  onMobileNavigationToggle,
  userName,
  workspaceLabel = "Visão geral",
}: TopBarProps) {
  return (
    <header className={topBarStyles.root}>
      <div className="flex min-w-0 items-center gap-3">
        <button
          aria-expanded={isMobileNavigationOpen}
          aria-label={isMobileNavigationOpen ? "Fechar navegação" : "Abrir navegação"}
          className={topBarStyles.mobileNavigationButton}
          onClick={onMobileNavigationToggle}
          type="button"
        >
          {isMobileNavigationOpen ? (
            <X aria-hidden="true" className="size-5" />
          ) : (
            <Menu aria-hidden="true" className="size-5" />
          )}
        </button>

        <div className={topBarStyles.workspace}>
          <p className={topBarStyles.workspaceLabel}>{workspaceLabel}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className={topBarStyles.company} title={companyName}>
          <span aria-hidden="true" className={topBarStyles.companyIndicator} />
          <span className={topBarStyles.companyName}>
            {companyName ?? "Empresa não selecionada"}
          </span>
        </div>

        <span
          aria-label={userName ? `Usuário: ${userName}` : "Usuário não identificado"}
          className={cn(topBarStyles.userAvatar, !userName && "bg-zinc-400")}
          role="img"
          title={userName}
        >
          {getInitials(userName)}
        </span>
      </div>
    </header>
  );
}
