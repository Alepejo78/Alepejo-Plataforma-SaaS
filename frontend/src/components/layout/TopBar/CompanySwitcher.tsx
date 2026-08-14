"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

import { useAuth } from "@/providers/AuthProvider";
import { authService } from "@/services/auth.service";
import { companyService, type Company } from "@/services/company.service";

import { topBarStyles } from "./TopBar.styles";

/**
 * Login cruzado: se este usuário só acessa uma empresa, mostra o
 * indicador estático de sempre (sem seta, sem chamada extra). Se
 * acessa mais de uma (UserCompany, ver AuthService.switchCompany),
 * vira um dropdown pra trocar a empresa ativa da sessão.
 */
export function CompanySwitcher() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[] | null>(null);
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      return;
    }

    let cancelled = false;

    companyService
      .myCompanies()
      .then((items) => {
        if (!cancelled) {
          setCompanies(items);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCompanies([]);
        }
      });

    return () => {
      cancelled = true;
    };
    // Depende do objeto `user` inteiro (não só do id): refreshUser()
    // troca a referência a cada /auth/me novo, mesmo com o mesmo id —
    // é o gatilho pra rebuscar a lista depois de marcar/desmarcar uma
    // empresa pra si mesmo no cadastro de usuário.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const companyName = user?.company?.tradeName;
  const canSwitch = (companies?.length ?? 0) > 1;

  const handleSwitch = async (companyId: string) => {
    if (companyId === user?.companyId || switching) {
      setOpen(false);
      return;
    }

    setSwitching(true);

    try {
      await authService.switchCompany(companyId);
      // Recarrega a página inteira: praticamente toda tela busca dados
      // assumindo uma empresa fixa por sessão, então invalidar cache
      // tela por tela seria mais arriscado que só recarregar.
      window.location.reload();
    } catch {
      setSwitching(false);
      setOpen(false);
    }
  };

  if (!canSwitch) {
    return (
      <div className={topBarStyles.company} title={companyName}>
        <span aria-hidden="true" className={topBarStyles.companyIndicator} />
        <span className={topBarStyles.companyName}>
          {companyName ?? "Empresa não selecionada"}
        </span>
      </div>
    );
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        aria-expanded={open}
        aria-label="Trocar de empresa"
        title={companyName}
        disabled={switching}
        className={`${topBarStyles.company} !flex cursor-pointer transition-colors hover:bg-[var(--surface)] disabled:cursor-wait disabled:opacity-60`}
      >
        <span aria-hidden="true" className={topBarStyles.companyIndicator} />
        <span className={topBarStyles.companyName}>
          {companyName ?? "Empresa não selecionada"}
        </span>
        <ChevronDown
          aria-hidden="true"
          size={14}
          className="shrink-0 text-[var(--text-muted)]"
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-64 space-y-0.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-lg">
          <p className="px-3 pb-1 pt-1.5 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
            Trocar de empresa
          </p>

          {companies?.map((company) => {
            const isCurrent = company.id === user?.companyId;

            return (
              <button
                key={company.id}
                type="button"
                onClick={() => void handleSwitch(company.id)}
                className={`flex h-10 w-full items-center justify-between gap-2 rounded-xl px-3 text-left text-sm font-medium transition-colors ${
                  isCurrent
                    ? "bg-[var(--surface-hover)] text-[var(--text-primary)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                }`}
              >
                <span className="truncate">
                  {company.tradeName || company.legalName}
                </span>
                {isCurrent && (
                  <span className="shrink-0 text-xs text-[var(--text-muted)]">
                    Atual
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
