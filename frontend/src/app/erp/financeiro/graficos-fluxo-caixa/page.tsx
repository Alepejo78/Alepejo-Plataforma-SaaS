"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AppShell } from "@/components";
import { ListPageLayout } from "@/components/layout/ListPageLayout";

import {
  budgetService,
  type BudgetYear,
} from "@/services/budget.service";

const MONTH_LABELS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

function money(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
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

const legendStyle = {
  fontSize: 12,
  color: "var(--text-secondary)",
};

export default function GraficosFluxoCaixaPage() {
  const [year, setYear] = useState(() =>
    new Date().getFullYear()
  );
  const [data, setData] = useState<BudgetYear | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (targetYear: number) => {
    setLoading(true);
    setError("");

    try {
      const result = await budgetService.getYear(targetYear);

      setData(result);
    } catch (err) {
      setError(
        extractMessage(
          err,
          "Não foi possível carregar o fluxo de caixa."
        )
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(year);
  }, [year, load]);

  const chartData = (data?.months ?? []).map((m, i) => ({
    month: MONTH_LABELS[i],
    receitaRealizada: m.receivable.realized,
    despesaRealizada: m.payable.realized,
    metaReceita: m.receivable.planned,
    metaDespesa: m.payable.planned,
  }));

  return (
    <AppShell workspaceLabel="Financeiro">
      <ListPageLayout
        header={
          <>
            <header className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                  Gráficos de fluxo de caixa
                </h1>

                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Receita e despesas realizadas por mês, e o
                  comparativo com a meta orçada.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setYear((y) => y - 1)}
                  aria-label="Ano anterior"
                  className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)]"
                >
                  <ChevronLeft size={18} />
                </button>

                <span className="w-16 text-center text-lg font-semibold text-[var(--text-primary)]">
                  {year}
                </span>

                <button
                  type="button"
                  onClick={() => setYear((y) => y + 1)}
                  aria-label="Próximo ano"
                  className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)]"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
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
            <div className="grid gap-4 lg:grid-cols-2">
              <Panel title="Receita realizada por mês">
                <div style={{ height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{
                        top: 8,
                        right: 8,
                        bottom: 8,
                        left: 8,
                      }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--border)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="month"
                        stroke="var(--text-muted)"
                        fontSize={12}
                      />
                      <YAxis
                        stroke="var(--text-muted)"
                        fontSize={12}
                        tickFormatter={(v) => money(v)}
                        width={80}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        cursor={{ fill: "var(--surface-hover)" }}
                        formatter={(v) => money(Number(v))}
                      />
                      <Bar
                        dataKey="receitaRealizada"
                        name="Receita"
                        fill="var(--success)"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Panel>

              <Panel title="Despesas realizadas por mês">
                <div style={{ height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{
                        top: 8,
                        right: 8,
                        bottom: 8,
                        left: 8,
                      }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--border)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="month"
                        stroke="var(--text-muted)"
                        fontSize={12}
                      />
                      <YAxis
                        stroke="var(--text-muted)"
                        fontSize={12}
                        tickFormatter={(v) => money(v)}
                        width={80}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        cursor={{ fill: "var(--surface-hover)" }}
                        formatter={(v) => money(Number(v))}
                      />
                      <Bar
                        dataKey="despesaRealizada"
                        name="Despesas"
                        fill="var(--danger)"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Panel>
            </div>

            <Panel title="Realizado vs. orçado">
              <div style={{ height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{
                      top: 8,
                      right: 24,
                      bottom: 8,
                      left: 8,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border)"
                    />
                    <XAxis
                      dataKey="month"
                      stroke="var(--text-muted)"
                      fontSize={12}
                    />
                    <YAxis
                      stroke="var(--text-muted)"
                      fontSize={12}
                      tickFormatter={(v) => money(v)}
                      width={80}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(v) => money(Number(v))}
                    />
                    <Legend wrapperStyle={legendStyle} />
                    <Line
                      type="monotone"
                      dataKey="receitaRealizada"
                      name="Receita realizada"
                      stroke="var(--success)"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="despesaRealizada"
                      name="Despesas realizadas"
                      stroke="var(--danger)"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="metaReceita"
                      name="Meta receita"
                      stroke="var(--success)"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="metaDespesa"
                      name="Meta despesas"
                      stroke="var(--danger)"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </div>
        )}
      </ListPageLayout>
    </AppShell>
  );
}
