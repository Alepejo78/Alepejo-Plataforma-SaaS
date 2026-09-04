"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { AppShell } from "@/components";
import { ListPageLayout } from "@/components/layout/ListPageLayout";
import { ExportButton } from "@/components/ui/ExportButton";

import {
  financialEntryService,
  type CashFlow,
  type CashFlowBucket,
  type PeriodKind,
  type PeriodSummary,
} from "@/services/financial-entry.service";

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

type Tone = "neutral" | "success" | "info" | "warning" | "danger";

const TONE_CLASS: Record<Tone, string> = {
  neutral: "text-[var(--text-primary)]",
  success: "text-[var(--success)]",
  info: "text-[var(--primary-text)]",
  warning: "text-[var(--warning)]",
  danger: "text-[var(--danger)]",
};

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

interface Row {
  label: string;
  values: number[];
  tone: Tone;
  /** Linha "Total ..." que abre o grupo — leva a divisória por cima. */
  groupStart?: boolean;
  /** Formata como percentual em vez de moeda (linha "% da meta"). */
  isPercent?: boolean;
  /**
   * Para "% da meta": em receita, bater 100%+ é bom (verde). Em
   * despesa, passar de 100% do orçado é ruim (vira vermelho) — inverte
   * a cor padrão.
   */
  invertPercentTone?: boolean;
}

function bucketRows(
  months: CashFlow["months"],
  key: "receivable" | "payable",
  totalLabel: string,
  settledLabel: string,
  settledTone: Tone,
  openLabel: string,
  openTone: Tone,
): Row[] {
  const pick = (fn: (b: CashFlowBucket) => number) =>
    months.map((m) => fn(m[key]));

  return [
    {
      label: totalLabel,
      values: pick((b) => b.total),
      tone: "neutral",
      groupStart: true,
    },
    { label: settledLabel, values: pick((b) => b.settled), tone: settledTone },
    { label: openLabel, values: pick((b) => b.open), tone: openTone },
    { label: "Atrasado", values: pick((b) => b.overdue), tone: "danger" },
  ];
}

function metaRows(
  months: CashFlow["months"],
  budgetMonths: BudgetYear["months"],
  key: "receivable" | "payable",
  metaLabel: string,
): Row[] {
  const meta = budgetMonths.map((m) => m[key].planned);
  const realizado = months.map((m) => m[key].settled);

  const pct = meta.map((m, i) =>
    m > 0 ? (realizado[i] / m) * 100 : 0
  );

  return [
    { label: metaLabel, values: meta, tone: "neutral" },
    {
      label: "% da meta",
      values: pct,
      tone: "info",
      isPercent: true,
      invertPercentTone: key === "payable",
    },
  ];
}

function sum(values: number[]) {
  return values.reduce((acc, v) => acc + v, 0);
}

// ---- Visão por período (dia/semana/mês) — complementa a visão anual acima ----

function moneyFull(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

const PERIOD_LABELS: Record<PeriodKind, string> = {
  day: "Dia",
  week: "Semana",
  month: "Mês",
};

const PERIOD_STEP_DAYS: Record<PeriodKind, number> = {
  day: 1,
  week: 7,
  month: 30,
};

function formatPeriodRange(period: PeriodKind, start: string, end: string) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  endDate.setUTCDate(endDate.getUTCDate() - 1);

  const fmt = (d: Date) =>
    d.toLocaleDateString("pt-BR", { timeZone: "UTC" });

  if (period === "day") {
    return fmt(startDate);
  }

  return `${fmt(startDate)} a ${fmt(endDate)}`;
}

function shiftReferenceDate(
  dateStr: string,
  period: PeriodKind,
  direction: 1 | -1
) {
  const date = new Date(dateStr);

  if (period === "month") {
    date.setUTCMonth(date.getUTCMonth() + direction);
  } else {
    date.setUTCDate(
      date.getUTCDate() + direction * PERIOD_STEP_DAYS[period]
    );
  }

  return date.toISOString().slice(0, 10);
}

function SectionHeader({
  label,
  tone,
}: {
  label: string;
  tone: "success" | "warning";
}) {
  const bg =
    tone === "success"
      ? "bg-[var(--success-soft)]"
      : "bg-[var(--warning-soft)]";

  const text =
    tone === "success"
      ? "text-[var(--success)]"
      : "text-[var(--warning)]";

  return (
    <tr>
      <td
        colSpan={14}
        className={`px-4 py-2 text-xs font-bold uppercase tracking-wider ${bg} ${text}`}
      >
        {label}
      </td>
    </tr>
  );
}

export default function FluxoCaixaPage() {
  const exportTableRef = useRef<HTMLTableElement>(null);
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [cashFlow, setCashFlow] = useState<CashFlow | null>(null);
  const [budget, setBudget] = useState<BudgetYear | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Visão por período (dia/semana/mês) — alternativa à visão anual
  // acima, pra ver rápido se precisa reduzir despesa no curto prazo.
  const [mode, setMode] = useState<"ano" | "periodo">("ano");
  const [period, setPeriod] = useState<PeriodKind>("month");
  const [referenceDate, setReferenceDate] = useState(todayIso());
  const [periodSummary, setPeriodSummary] = useState<PeriodSummary | null>(
    null
  );
  const [periodLoading, setPeriodLoading] = useState(true);
  const [periodError, setPeriodError] = useState("");

  const loadPeriod = useCallback(async () => {
    setPeriodLoading(true);
    setPeriodError("");

    try {
      const result = await financialEntryService.getPeriodSummary(
        period,
        referenceDate
      );

      setPeriodSummary(result);
    } catch (err) {
      setPeriodError(
        extractMessage(
          err,
          "Não foi possível carregar o fluxo de caixa do período."
        )
      );
    } finally {
      setPeriodLoading(false);
    }
  }, [period, referenceDate]);

  useEffect(() => {
    if (mode === "periodo") {
      void loadPeriod();
    }
  }, [mode, loadPeriod]);

  const load = useCallback(async (targetYear: number) => {
    setLoading(true);
    setError("");

    try {
      const [cashFlowResult, budgetResult] = await Promise.all([
        financialEntryService.getCashFlow(targetYear),
        budgetService.getYear(targetYear),
      ]);

      setCashFlow(cashFlowResult);
      setBudget(budgetResult);
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

  const receivableRows =
    cashFlow && budget
      ? [
          ...bucketRows(
            cashFlow.months,
            "receivable",
            "Total receita",
            "Recebido",
            "success",
            "A receber",
            "info"
          ),
          ...metaRows(
            cashFlow.months,
            budget.months,
            "receivable",
            "Meta receita"
          ),
        ]
      : [];

  const payableRows =
    cashFlow && budget
      ? [
          ...bucketRows(
            cashFlow.months,
            "payable",
            "Total despesas",
            "Pago",
            "success",
            "A pagar",
            "warning"
          ),
          ...metaRows(
            cashFlow.months,
            budget.months,
            "payable",
            "Meta despesas"
          ),
        ]
      : [];

  const balanceRow: Row | null = cashFlow
    ? {
        label: "Saldo do mês",
        values: cashFlow.months.map((m) => m.balance),
        tone: "neutral",
        groupStart: true,
      }
    : null;

  const cumulativeRow: Row | null = cashFlow
    ? {
        label: "Saldo acumulado",
        values: cashFlow.months.map((m) => m.cumulativeBalance),
        tone: "neutral",
      }
    : null;

  return (
    <AppShell workspaceLabel="Financeiro">
      <ListPageLayout
        header={
          <>
            <header className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                  Fluxo de caixa
                </h1>

                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Totais mensais calculados a partir das contas a
                  receber e a pagar. Não é possível digitar valores
                  aqui.
                </p>
              </div>

              <div className="flex items-center gap-3">
                {mode === "ano" && (
                  <ExportButton
                    tableRef={exportTableRef}
                    filename="fluxo-de-caixa"
                    sheetName="Fluxo de caixa"
                  />
                )}

                {mode === "ano" ? (
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
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setReferenceDate((d) =>
                          shiftReferenceDate(d, period, -1)
                        )
                      }
                      aria-label="Período anterior"
                      className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)]"
                    >
                      <ChevronLeft size={18} />
                    </button>

                    <span className="min-w-40 text-center text-sm font-medium text-[var(--text-primary)]">
                      {periodSummary
                        ? formatPeriodRange(
                            period,
                            periodSummary.start,
                            periodSummary.end
                          )
                        : "—"}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        setReferenceDate((d) =>
                          shiftReferenceDate(d, period, 1)
                        )
                      }
                      aria-label="Próximo período"
                      className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)]"
                    >
                      <ChevronRight size={18} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setReferenceDate(todayIso())}
                      className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)]"
                    >
                      Hoje
                    </button>
                  </div>
                )}
              </div>
            </header>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode("ano")}
                className={`rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                  mode === "ano"
                    ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary-text)]"
                    : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                }`}
              >
                Visão anual
              </button>

              {(Object.keys(PERIOD_LABELS) as PeriodKind[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setMode("periodo");
                    setPeriod(p);
                  }}
                  className={`rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                    mode === "periodo" && period === p
                      ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary-text)]"
                      : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                  }`}
                >
                  {PERIOD_LABELS[p]}
                </button>
              ))}
            </div>

            {mode === "periodo" && periodError && (
              <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                {periodError}
              </div>
            )}

            {mode === "ano" && error && (
              <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                {error}
              </div>
            )}
          </>
        }
      >
        {mode === "periodo" ? (
          <PeriodSummaryView
            summary={periodSummary}
            loading={periodLoading}
          />
        ) : loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="h-10 animate-pulse rounded-xl bg-[var(--surface-hover)]"
              />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table ref={exportTableRef} className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-[var(--table-header-bg)] text-[var(--table-header-fg)]">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold">
                    &nbsp;
                  </th>

                  {MONTH_LABELS.map((label) => (
                    <th
                      key={label}
                      className="whitespace-nowrap px-4 py-3 text-right font-semibold uppercase tracking-wide"
                    >
                      {label}
                    </th>
                  ))}

                  <th className="whitespace-nowrap border-l border-white/20 px-4 py-3 text-right font-semibold uppercase tracking-wide">
                    Total
                  </th>
                </tr>
              </thead>

              <tbody>
                <SectionHeader label="Receitas" tone="success" />

                {receivableRows.map((row) => (
                  <RowLine
                    key={`receivable-${row.label}`}
                    row={row}
                  />
                ))}

                <tr>
                  <td
                    colSpan={14}
                    className="border-t border-[var(--border)]"
                  />
                </tr>

                <SectionHeader label="Despesas" tone="warning" />

                {payableRows.map((row) => (
                  <RowLine
                    key={`payable-${row.label}`}
                    row={row}
                  />
                ))}

                {balanceRow && (
                  <>
                    <tr>
                      <td
                        colSpan={14}
                        className="border-t border-[var(--border)]"
                      />
                    </tr>

                    <RowLine row={balanceRow} />
                  </>
                )}

                {cumulativeRow && <RowLine row={cumulativeRow} />}
              </tbody>
            </table>
          </div>
        )}
      </ListPageLayout>
    </AppShell>
  );
}

function RowLine({ row }: { row: Row }) {
  const isBalance = row.label.includes("Saldo");
  const format = row.isPercent
    ? (v: number) =>
        `${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%`
    : money;

  const total = row.isPercent
    ? null
    : row.label === "Saldo acumulado"
      ? row.values[row.values.length - 1]
      : sum(row.values);

  return (
    <tr
      className={`border-t border-[var(--border)] ${
        row.groupStart ? "bg-[var(--surface-hover)]" : ""
      }`}
    >
      <td
        className={`whitespace-nowrap px-4 py-2.5 font-bold ${
          row.tone === "neutral" ? "" : "pl-8"
        } ${TONE_CLASS[row.tone]}`}
      >
        {row.label}
      </td>

      {row.values.map((value, i) => (
        <td
          key={i}
          className={`whitespace-nowrap px-4 py-2.5 text-right font-bold ${
            isBalance
              ? value < 0
                ? TONE_CLASS.danger
                : value > 0
                  ? TONE_CLASS.success
                  : TONE_CLASS.neutral
              : row.isPercent
                ? value >= 100
                  ? TONE_CLASS[
                      row.invertPercentTone
                        ? "danger"
                        : "success"
                    ]
                  : TONE_CLASS[
                      row.invertPercentTone
                        ? "success"
                        : "danger"
                    ]
                : TONE_CLASS[row.tone]
          }`}
        >
          {format(value)}
        </td>
      ))}

      <td
        className={`whitespace-nowrap border-l border-[var(--border)] px-4 py-2.5 text-right font-bold ${
          total === null
            ? "text-[var(--text-muted)]"
            : isBalance
              ? total < 0
                ? TONE_CLASS.danger
                : total > 0
                  ? TONE_CLASS.success
                  : TONE_CLASS.neutral
              : TONE_CLASS[row.tone]
        }`}
      >
        {total === null ? "—" : format(total)}
      </td>
    </tr>
  );
}

function PeriodSummaryView({
  summary,
  loading,
}: {
  summary: PeriodSummary | null;
  loading: boolean;
}) {
  const receivable = summary?.receivable;
  const payable = summary?.payable;

  return (
    <div className="grid gap-5 p-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp size={18} className="text-[var(--success)]" />

          <h2 className="font-semibold text-[var(--text-primary)]">
            A Receber
          </h2>
        </div>

        <div className="space-y-3">
          {[
            { label: "Recebido", value: receivable?.settled },
            { label: "A receber (previsto)", value: receivable?.open },
            { label: "Vencido", value: receivable?.overdue },
          ].map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between border-b border-[var(--border)] pb-2 last:border-0"
            >
              <span className="text-sm text-[var(--text-secondary)]">
                {row.label}
              </span>

              {loading ? (
                <span className="h-5 w-20 animate-pulse rounded bg-[var(--surface-hover)]" />
              ) : (
                <span className="font-medium text-[var(--text-primary)]">
                  {moneyFull(row.value ?? 0)}
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-xl bg-[var(--surface-hover)] p-3">
          <p className="text-xs text-[var(--text-muted)]">
            Total do período
          </p>
          <p className="text-lg font-bold text-[var(--text-primary)]">
            {moneyFull(receivable?.total ?? 0)}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="mb-4 flex items-center gap-2">
          <TrendingDown size={18} className="text-[var(--danger)]" />

          <h2 className="font-semibold text-[var(--text-primary)]">
            A Pagar
          </h2>
        </div>

        <div className="space-y-3">
          {[
            { label: "Pago", value: payable?.settled },
            { label: "A pagar (previsto)", value: payable?.open },
            { label: "Vencido", value: payable?.overdue },
          ].map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between border-b border-[var(--border)] pb-2 last:border-0"
            >
              <span className="text-sm text-[var(--text-secondary)]">
                {row.label}
              </span>

              {loading ? (
                <span className="h-5 w-20 animate-pulse rounded bg-[var(--surface-hover)]" />
              ) : (
                <span className="font-medium text-[var(--text-primary)]">
                  {moneyFull(row.value ?? 0)}
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-xl bg-[var(--surface-hover)] p-3">
          <p className="text-xs text-[var(--text-muted)]">
            Total do período
          </p>
          <p className="text-lg font-bold text-[var(--text-primary)]">
            {moneyFull(payable?.total ?? 0)}
          </p>
        </div>
      </div>
    </div>
  );
}
