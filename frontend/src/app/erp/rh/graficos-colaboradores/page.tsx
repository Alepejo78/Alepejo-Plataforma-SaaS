"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AppShell } from "@/components";
import { ListPageLayout } from "@/components/layout/ListPageLayout";
import { GenderProfileChart } from "@/components/dashboard/GenderProfileChart";

import {
  employeeReportsService,
  type EmployeeIndicators,
} from "@/services/hr.service";

const CHART_COLORS = [
  "var(--primary)",
  "var(--success)",
  "var(--warning)",
  "var(--danger)",
  "var(--primary-hover)",
  "var(--text-secondary)",
];


function money(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function extractMessage(err: unknown, fallback: string) {
  const message = (
    err as { response?: { data?: { message?: unknown } } }
  )?.response?.data?.message;

  if (Array.isArray(message)) {
    return message.join(" ");
  }

  return typeof message === "string" ? message : fallback;
}

function Card({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] p-5">
      <p className="text-sm text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">
        {value}
      </p>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)]">
      <div className="border-b border-[var(--border)] bg-[var(--surface-hover)] px-4 py-3">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">
          {title}
        </h2>
      </div>

      <div className="p-4">{children}</div>
    </div>
  );
}

const tooltipStyle = {
  backgroundColor: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--text-primary)",
  fontSize: 13,
};

export default function GraficosColaboradoresPage() {
  const [data, setData] = useState<EmployeeIndicators | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await employeeReportsService.getIndicators();

      setData(result);
    } catch (err) {
      setError(
        extractMessage(
          err,
          "Não foi possível carregar os indicadores."
        )
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const byFunction = [...(data?.byFunction ?? [])].sort(
    (a, b) => b.count - a.count
  );

  const bySector = data?.bySector ?? [];

  const chartHeight = Math.max(
    220,
    byFunction.length * 34 + 40
  );

  return (
    <AppShell workspaceLabel="Recursos Humanos">
      <ListPageLayout
        header={
          <>
            <header>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                Gráficos de colaboradores
              </h1>

              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Visão gráfica dos colaboradores ativos: função,
                setor e sexo.
              </p>
            </header>

            {error && (
              <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                {error}
              </div>
            )}
          </>
        }
      >
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-64 animate-pulse rounded-2xl bg-[var(--surface-hover)]"
              />
            ))}
          </div>
        ) : !data ? null : (
          <div className="space-y-6 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Card
                label="Colaboradores ativos"
                value={String(data.totalActive)}
              />
              <Card
                label="Média salarial geral"
                value={money(data.averageSalary)}
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <Panel title="Colaboradores por função">
                {byFunction.length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)]">
                    Sem dados.
                  </p>
                ) : (
                  <div style={{ height: Math.max(220, chartHeight) }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={byFunction}
                        layout="vertical"
                        margin={{
                          top: 8,
                          right: 16,
                          bottom: 8,
                          left: 8,
                        }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="var(--border)"
                          horizontal={false}
                        />
                        <XAxis
                          type="number"
                          allowDecimals={false}
                          stroke="var(--text-muted)"
                          fontSize={12}
                        />
                        <YAxis
                          type="category"
                          dataKey="jobFunctionName"
                          stroke="var(--text-muted)"
                          fontSize={11}
                          width={90}
                        />
                        <Tooltip
                          contentStyle={tooltipStyle}
                          cursor={{ fill: "var(--surface-hover)" }}
                        />
                        <Bar
                          dataKey="count"
                          name="Colaboradores"
                          fill="var(--primary)"
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Panel>

              <Panel title="Colaboradores por setor">
                {bySector.length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)]">
                    Sem dados.
                  </p>
                ) : (
                  <div style={{ height: 220 }}>
                    <ResponsiveContainer
                      width="100%"
                      height="100%"
                    >
                      <PieChart>
                        <Pie
                          data={bySector}
                          dataKey="count"
                          nameKey="sectorName"
                          innerRadius={45}
                          outerRadius={75}
                          paddingAngle={2}
                        >
                          {bySector.map((entry, index) => (
                            <Cell
                              key={entry.sectorId ?? index}
                              fill={
                                CHART_COLORS[
                                  index % CHART_COLORS.length
                                ]
                              }
                            />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend
                          wrapperStyle={{
                            fontSize: 11,
                            color: "var(--text-secondary)",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Panel>

              <Panel title="Colaboradores por sexo">
                <div
                  style={{ height: 220 }}
                  className="flex items-center justify-center"
                >
                  <GenderProfileChart
                    masculinoCount={
                      data?.byGender.find((g) => g.gender === "MASCULINO")
                        ?.count ?? 0
                    }
                    femininoCount={
                      data?.byGender.find((g) => g.gender === "FEMININO")
                        ?.count ?? 0
                    }
                    compact
                  />
                </div>
              </Panel>
            </div>
          </div>
        )}
      </ListPageLayout>
    </AppShell>
  );
}
