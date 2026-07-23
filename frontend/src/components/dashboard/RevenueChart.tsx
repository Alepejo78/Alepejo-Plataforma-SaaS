"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Surface, Typography } from "@/components";

const data = [
  { mes: "Jan", valor: 180 },
  { mes: "Fev", valor: 240 },
  { mes: "Mar", valor: 220 },
  { mes: "Abr", valor: 310 },
  { mes: "Mai", valor: 420 },
  { mes: "Jun", valor: 390 },
  { mes: "Jul", valor: 480 },
];

export function RevenueChart() {
  return (
    <Surface className="rounded-2xl border border-[var(--border)] p-6">
      <div className="mb-6">
        <Typography variant="title">
          Faturamento
        </Typography>

        <Typography
          variant="caption"
          className="text-[var(--text-muted)]"
        >
          Últimos 7 meses
        </Typography>
      </div>

      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
            />

            <XAxis dataKey="mes" />

            <YAxis />

            <Tooltip />

            <Bar
              dataKey="valor"
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Surface>
  );
}