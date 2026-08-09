"use client";

import { Menu, X } from "lucide-react";

import { useAuth } from "@/providers/AuthProvider";

import { ThemeSwitcher } from "../ThemeSwitcher";
import { UserMenu } from "../UserMenu/UserMenu";
import { topBarStyles } from "./TopBar.styles";
import type { TopBarProps } from "./TopBar.types";

export function TopBar({
  companyName,
  isMobileNavigationOpen,
  onMobileNavigationToggle,
  workspaceLabel = "Visão geral",
  showMobileNavigationToggle = true,
}: TopBarProps) {
  const { user, hasModule } = useAuth();

  const canToggleTheme =
    hasModule("BRANDING") &&
    Boolean(user?.company.brandingThemeToggleEnabled);

  return (
    <header className={topBarStyles.root}>
      <div className="flex min-w-0 items-center gap-3">
        {showMobileNavigationToggle && (
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
        )}

        <div className={topBarStyles.workspace}>
          <p className={topBarStyles.workspaceLabel}>{workspaceLabel}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {canToggleTheme && <ThemeSwitcher />}

        <div className={topBarStyles.company} title={companyName}>
          <span aria-hidden="true" className={topBarStyles.companyIndicator} />
          <span className={topBarStyles.companyName}>
            {companyName ?? "Empresa não selecionada"}
          </span>
        </div>

        <UserMenu />
      </div>
    </header>
  );
}
