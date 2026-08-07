"use client";

import Image from "next/image";

import { systemConfig } from "@/config/system";

interface BrandProps {
  collapsed?: boolean;
}

export function Brand({
  collapsed = false,
}: BrandProps) {
  const { company, systemName } = systemConfig;

  // Recolhida, a barra tem 72px: a logo precisa caber dentro dela.
  const size = collapsed ? 36 : company.logoWidth;

  return (
    <div className="flex min-w-0 items-center gap-3">
      <Image
        src={company.logo}
        alt={company.name}
        width={size}
        height={size}
        priority
        className="shrink-0 object-contain"
        style={{ width: size, height: size }}
      />

      {!collapsed && (
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold text-[var(--text-primary)]">
            {company.name}
          </h1>

          <p className="truncate text-sm text-[var(--text-secondary)]">
            {systemName}
          </p>
        </div>
      )}
    </div>
  );
}
