"use client";

import {
  CheckCircle2,
  Clock3,
  Package,
  ShoppingCart,
  UserPlus,
} from "lucide-react";

import { Surface, Typography } from "@/components";

interface Activity {
  id: number;
  title: string;
  description: string;
  time: string;
  icon: React.ReactNode;
}

const activities: Activity[] = [
  {
    id: 1,
    title: "Novo cliente cadastrado",
    description: "Empresa ABC Comércio",
    time: "5 min atrás",
    icon: <UserPlus size={18} />,
  },
  {
    id: 2,
    title: "Pedido criado",
    description: "Pedido #100254",
    time: "18 min atrás",
    icon: <ShoppingCart size={18} />,
  },
  {
    id: 3,
    title: "Estoque atualizado",
    description: "Entrada de 350 produtos",
    time: "42 min atrás",
    icon: <Package size={18} />,
  },
  {
    id: 4,
    title: "Processo finalizado",
    description: "Sincronização concluída",
    time: "1 hora atrás",
    icon: <CheckCircle2 size={18} />,
  },
];

export function RecentActivities() {
  return (
    <Surface className="rounded-2xl border border-[var(--border)] p-6">
      <div className="mb-6">
        <Typography variant="title">
          Atividades Recentes
        </Typography>

        <Typography
          variant="body"
          className="text-[var(--text-muted)]"
        >
          Últimas movimentações do sistema.
        </Typography>
      </div>

      <div className="space-y-5">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="flex items-start gap-4"
          >
            <div
              className="
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-xl
                bg-[var(--surface-hover)]
                text-[var(--primary)]
              "
            >
              {activity.icon}
            </div>

            <div className="flex-1">
              <Typography variant="body">
                {activity.title}
              </Typography>

              <Typography
                variant="caption"
                className="text-[var(--text-muted)]"
              >
                {activity.description}
              </Typography>
            </div>

            <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
              <Clock3 size={14} />
              {activity.time}
            </div>
          </div>
        ))}
      </div>
    </Surface>
  );
}