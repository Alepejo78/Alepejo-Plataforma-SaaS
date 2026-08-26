"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
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
import {
  financialEntryService,
  PAYMENT_METHOD_LABELS,
  type AccountBreakdownRow,
  type PaymentMethodBreakdownRow,
} from "@/services/financial-entry.service";

/** Paleta pra "forma de pagamento/recebimento" — quantidade de formas varia, roda em ciclo. */
const PAYMENT_METHOD_COLORS = [
  "var(--primary)",
  "var(--success)",
  "var(--warning)",
  "#d6336c",
  "#7c3aed",
  "#0891b2",
  "var(--danger)",
  "var(--text-muted)",
];

function paymentMethodLabel(method: string) {
  if (method === "NAO_INFORMADO") return "Não informado";
  return (
    PAYMENT_METHOD_LABELS[method as keyof typeof PAYMENT_METHOD_LABELS] ??
    method
  );
}

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

/**
 * Painel de acompanhamento por tipo (despesa ou receita), reaproveitado
 * pros dois lados — só troca os dados, o rótulo "pago"/"a pagar" e a
 * cor. Barra deitada porque nome de conta é texto longo — em barra em
 * pé o rótulo vira sopa de letras inclinada. Cada barra separa o que já
 * passou pelo caixa do que ainda vai passar, que são leituras diferentes.
 */
function AccountBreakdownPanel({
  title,
  emptyLabel,
  rows,
  year,
  tone,
  paidLabel,
  openLabel,
}: {
  title: string;
  emptyLabel: string;
  rows: AccountBreakdownRow[];
  year: number;
  tone: "danger" | "success";
  paidLabel: string;
  openLabel: string;
}) {
  return (
    <Panel title={title}>
      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-[var(--text-muted)]">
          {emptyLabel} em {year}.
        </p>
      ) : (
        <div
          style={{
            height: Math.max(220, rows.length * 46 + 60),
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={rows}
              margin={{ top: 8, right: 24, bottom: 8, left: 8 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                horizontal={false}
              />
              <XAxis
                type="number"
                stroke="var(--text-muted)"
                fontSize={12}
                tickFormatter={(v) => money(v)}
              />
              <YAxis
                type="category"
                dataKey="description"
                stroke="var(--text-muted)"
                fontSize={12}
                width={170}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v) => money(Number(v))}
                cursor={{ fill: "var(--surface-hover)" }}
              />
              <Legend wrapperStyle={legendStyle} />
              <Bar
                dataKey="pago"
                name={paidLabel}
                stackId="total"
                fill={`var(--${tone})`}
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="emAberto"
                name={openLabel}
                stackId="total"
                fill="var(--warning)"
                radius={[0, 4, 4, 0]}
              >
                {rows.map((linha) => (
                  <Cell key={linha.description} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Panel>
  );
}

/** Pizza de forma de pagamento/recebimento — reaproveitada pros dois lados. */
function PaymentMethodPieChart({
  title,
  emptyLabel,
  rows,
  year,
}: {
  title: string;
  emptyLabel: string;
  rows: PaymentMethodBreakdownRow[];
  year: number;
}) {
  const chartData = rows.map((row, i) => ({
    name: paymentMethodLabel(row.method),
    value: row.total,
    fill: PAYMENT_METHOD_COLORS[i % PAYMENT_METHOD_COLORS.length],
  }));

  return (
    <Panel title={title}>
      {chartData.length === 0 ? (
        <p className="py-8 text-center text-sm text-[var(--text-muted)]">
          {emptyLabel} em {year}.
        </p>
      ) : (
        <div style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                innerRadius={50}
                outerRadius={90}
                paddingAngle={2}
              >
                {chartData.map((item) => (
                  <Cell key={item.name} fill={item.fill} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v, name) => [money(Number(v)), name]}
              />
              <Legend wrapperStyle={legendStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </Panel>
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
  const [despesasPorTipo, setDespesasPorTipo] = useState<
    AccountBreakdownRow[]
  >([]);
  const [receitasPorTipo, setReceitasPorTipo] = useState<
    AccountBreakdownRow[]
  >([]);
  const [formaPagamento, setFormaPagamento] = useState<
    PaymentMethodBreakdownRow[]
  >([]);
  const [formaRecebimento, setFormaRecebimento] = useState<
    PaymentMethodBreakdownRow[]
  >([]);

  const load = useCallback(async (targetYear: number) => {
    setLoading(true);
    setError("");

    try {
      const [result, despesas, receitas, pagamento, recebimento] =
        await Promise.all([
          budgetService.getYear(targetYear),
          // Falhar aqui não pode derrubar o fluxo de caixa: o gráfico por
          // tipo some, o resto da tela continua.
          financialEntryService
            .getAccountBreakdown(targetYear, "PAYABLE")
            .catch(() => [] as AccountBreakdownRow[]),
          financialEntryService
            .getAccountBreakdown(targetYear, "RECEIVABLE")
            .catch(() => [] as AccountBreakdownRow[]),
          financialEntryService
            .getPaymentMethodBreakdown(targetYear, "PAYABLE")
            .catch(() => [] as PaymentMethodBreakdownRow[]),
          financialEntryService
            .getPaymentMethodBreakdown(targetYear, "RECEIVABLE")
            .catch(() => [] as PaymentMethodBreakdownRow[]),
        ]);

      setData(result);
      setDespesasPorTipo(despesas);
      setReceitasPorTipo(receitas);
      setFormaPagamento(pagamento);
      setFormaRecebimento(recebimento);
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

            <div className="grid gap-4 lg:grid-cols-2">
              <AccountBreakdownPanel
                title="Despesas por tipo"
                emptyLabel="Nenhuma despesa lançada"
                rows={despesasPorTipo}
                year={year}
                tone="danger"
                paidLabel="Pago"
                openLabel="Em aberto"
              />

              <AccountBreakdownPanel
                title="Receitas por tipo"
                emptyLabel="Nenhuma receita lançada"
                rows={receitasPorTipo}
                year={year}
                tone="success"
                paidLabel="Recebido"
                openLabel="A receber"
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <PaymentMethodPieChart
                title="Forma de pagamento"
                emptyLabel="Nenhuma despesa lançada"
                rows={formaPagamento}
                year={year}
              />

              <PaymentMethodPieChart
                title="Forma de recebimento"
                emptyLabel="Nenhuma receita lançada"
                rows={formaRecebimento}
                year={year}
              />
            </div>

            <p className="text-xs text-[var(--text-muted)]">
              As despesas e receitas aparecem aqui conforme os títulos
              de contas a pagar e a receber forem cadastrados — o tipo
              vem do plano de contas escolhido na compra, na venda ou
              no próprio título.
            </p>
          </div>
        )}
      </ListPageLayout>
    </AppShell>
  );
}
