import { LucideIcon } from "lucide-react";

import { Surface, Typography } from "@/components";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    positive: boolean;
  };
  color?: "default" | "success" | "warning" | "danger" | "info";
}

export function StatCard({
  title,
  value,
  variation,
  icon: Icon,
}: StatCardProps) {
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

          <Typography variant="h3">
            {value}
          </Typography>

          <Typography
            variant="caption"
            className="text-emerald-600 font-medium"
          >
            {variation}
          </Typography>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100">
          <Icon
            size={22}
            className="text-zinc-700"
          />
        </div>
      </div>
    </Surface>
  );
}