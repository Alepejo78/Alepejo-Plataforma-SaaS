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

  return (
    <div className="flex items-center gap-4">
      <Image
        src={company.logo}
        alt={company.name}
        width={company.logoWidth}
        height={company.logoHeight}
        priority
        className="flex-shrink-0 object-contain"
      />

      {!collapsed && (
        <div className="min-w-0">
          <h1 className="truncate text-3xl font-bold text-[var(--text-primary)]">
            {company.name}
          </h1>

          <p className="truncate text-base text-[var(--text-muted)]">
            {systemName}
          </p>
        </div>
      )}
    </div>
  );
}