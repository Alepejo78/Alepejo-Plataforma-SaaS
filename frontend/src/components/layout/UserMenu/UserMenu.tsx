"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LogOut } from "lucide-react";

import { cn } from "@/lib";
import { useAuth } from "@/providers/AuthProvider";
import { brandingAssetUrl } from "@/services/company-branding.service";
import { systemMenuItems } from "../Sidebar/menu";

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

/**
 * Avatar do usuário no topo, agora clicável: abre o menu que antes
 * era o grupo "Sistema" da navegação principal (Licenciamento,
 * Configurações, Personalização) + Sair.
 */
export function UserMenu() {
  const { user, can, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

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
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
  }, [open]);

  const photo =
    user?.avatarEnabled && user.avatar
      ? brandingAssetUrl(user.avatar)
      : null;

  const visibleItems = systemMenuItems.filter(
    (item) => !item.permission || can(item.permission)
  );

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        aria-expanded={open}
        aria-label={
          user?.name
            ? `Menu de ${user.name}`
            : "Menu do usuário"
        }
        className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--primary)] text-base font-semibold text-[var(--primary-contrast)] ring-offset-2 transition-shadow hover:ring-2 hover:ring-[var(--primary)]"
      >
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt={user?.name ?? "Foto do usuário"}
            className="h-full w-full object-cover"
          />
        ) : (
          getInitials(user?.name)
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-56 space-y-0.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-lg">
          {user && (
            <div className="border-b border-[var(--border)] px-3 py-2">
              <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                {user.name}
              </p>

              <p className="truncate text-xs text-[var(--text-muted)]">
                {user.email}
              </p>
            </div>
          )}

          {visibleItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex h-10 items-center gap-2.5 rounded-xl px-3 text-sm font-medium text-[var(--text-secondary)] transition-colors",
                  "hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                )}
              >
                {Icon ? <Icon size={16} className="shrink-0" /> : null}
                {item.title}
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              void logout();
            }}
            className="flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-sm font-medium text-[var(--danger)] transition-colors hover:bg-[var(--danger-soft)]"
          >
            <LogOut size={16} className="shrink-0" />
            Sair
          </button>
        </div>
      )}
    </div>
  );
}
