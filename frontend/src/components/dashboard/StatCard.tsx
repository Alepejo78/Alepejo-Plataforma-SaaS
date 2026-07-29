import { LucideIcon } from "lucide-react";
import { isValidElement, ReactNode } from "react";

import { Surface, Typography } from "@/components";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode | LucideIcon;
  trend?: {
    value: number;
    positive: boolean;
  };
  variation?: string;
  color?: "default" | "success" | "warning" | "danger" | "info";
}

function renderIcon(icon?: ReactNode | LucideIcon) {
  if (!icon) {
    return null;
  }

  if (isValidElement(icon)) {
    return icon;
  }

  const IconComponent = icon as LucideIcon;

  return (
    <IconComponent
      size={22}
      className="text-zinc-700"
    />
  );
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  variation,
}: StatCardProps) {
  const displayVariation =
    variation ??
    (trend
      ? `${trend.positive ? "+" : "-"}${trend.value}%`
      : undefined);

  return (
    <Surface className="p-6">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Typography
            variant="caption"
            className="text-zinc-500"
          >
            {title}
          </Typography>

          {subtitle && (
            <Typography
              variant="caption"
              className="text-[var(--text-muted)]"
            >
              {subtitle}
            </Typography>
          )}

          <Typography variant="h3">
            {value}
          </Typography>

          {displayVariation && (
            <Typography
              variant="caption"
              className="font-medium text-emerald-600"
            >
              {displayVariation}
            </Typography>
          )}
        </div>

        {icon && (
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100">
            {renderIcon(icon)}
          </div>
        )}
      </div>
    </Surface>
  );
}
