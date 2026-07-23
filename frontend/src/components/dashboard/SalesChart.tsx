"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Surface, Typography } from "@/components";

const data = [
  { dia: "01", vendas: 12 },
  { dia: "05", vendas: 18 },
  { dia: "10", vendas: 24 },
  { dia: "15", vendas: 32 },
  { dia: "20", vendas: 27 },
  { dia: "25", vendas: 38 },
  { dia: "30", vendas: 45 },
];

export function SalesChart() {
  return (
    <Surface className="rounded-2xl border border-[var(--border)] p-6">
      <div className="mb-6">
        <Typography variant="title">
          Evolução das Vendas
        </Typography>

        <Typography
          variant="caption"
          className="text-[var(--text-muted)]"
        >
          Últimos 30 dias
        </Typography>
      </div>

      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopOpacity={0.35} />
                <stop offset="100%" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
            />

            <XAxis dataKey="dia" />

            <YAxis />

            <Tooltip />

            <Area
              type="monotone"
              dataKey="vendas"
              strokeWidth={3}
              fill="url(#salesGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Surface>
  );
}