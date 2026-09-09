"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Layers,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { AppShell } from "@/components";
import { PageAccessGuard } from "@/components/auth/PageAccessGuard";
import { ListPageLayout } from "@/components/layout/ListPageLayout";
import { ExportButton } from "@/components/ui/ExportButton";
import { MenuButton } from "@/components/ui/MenuButton";

import {
  financialEntryService,
  type CashFlow,
  type CashFlowBucket,
  type DailyCashFlow,
  type DailyCashFlowDay,
  type PeriodKind,
  type PeriodSummary,
} from "@/services/financial-entry.service";

import {
  budgetService,
  type BudgetYear,
} from "@/services/budget.service";

const MONTH_NAMES_FULL = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

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
  const [mode, setMode] = useState<"ano" | "periodo" | "diario">("ano");
  const [period, setPeriod] = useState<PeriodKind>("month");
  const [referenceDate, setReferenceDate] = useState(todayIso());
  const [periodSummary, setPeriodSummary] = useState<PeriodSummary | null>(
    null
  );
  const [periodLoading, setPeriodLoading] = useState(true);
  const [periodError, setPeriodError] = useState("");

  // Visão diária — dia a dia do mês inteiro, com opção de filtrar só
  // uma semana (mesmo modelo da planilha de fluxo de caixa da empresa).
  const today = new Date();
  const [dailyMonth, setDailyMonth] = useState(today.getMonth() + 1);
  const [dailyYear, setDailyYear] = useState(today.getFullYear());
  const [dailyFlow, setDailyFlow] = useState<DailyCashFlow | null>(null);
  const [dailyLoading, setDailyLoading] = useState(true);
  const [dailyError, setDailyError] = useState("");
  const [dailyFilter, setDailyFilter] = useState<"dia" | "semana">("dia");
  const [dailyWeek, setDailyWeek] = useState(1);

  const loadDaily = useCallback(async () => {
    setDailyLoading(true);
    setDailyError("");

    try {
      const result = await financialEntryService.getDailyCashFlow(
        dailyYear,
        dailyMonth
      );

      setDailyFlow(result);
    } catch (err) {
      setDailyError(
        extractMessage(
          err,
          "Não foi possível carregar o fluxo de caixa diário."
        )
      );
    } finally {
      setDailyLoading(false);
    }
  }, [dailyYear, dailyMonth]);

  useEffect(() => {
    if (mode === "diario") {
      void loadDaily();
    }
  }, [mode, loadDaily]);

  const dailyFilteredDays = dailyFlow
    ? dailyFilter === "semana"
      ? dailyFlow.days.filter((d) => d.week === dailyWeek)
      : dailyFlow.days
    : [];

  const dailyTotals = {
    receivable: dailyFilteredDays.reduce(
      (sum, d) => sum + d.receivablePrevisto,
      0
    ),
    payable: dailyFilteredDays.reduce(
      (sum, d) => sum + d.payablePrevisto,
      0
    ),
  };

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
    <PageAccessGuard permission="financial-entry.view">
    <AppShell workspaceLabel="Financeiro">
      <ListPageLayout
        header={
          <>
            <header className="flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                Fluxo de caixa
              </h1>

              <div className="flex flex-wrap items-center justify-end gap-3">
                {mode === "ano" && (
                  <ExportButton
                    tableRef={exportTableRef}
                    filename="fluxo-de-caixa"
                    sheetName="Fluxo de caixa"
                  />
                )}

                <MenuButton
                  label="Visão"
                  icon={<Layers size={18} />}
                  items={[
                    { label: "Visão anual", onClick: () => setMode("ano") },
                    {
                      label: "Dia",
                      onClick: () => {
                        setMode("periodo");
                        setPeriod("day");
                      },
                    },
                    {
                      label: "Semana",
                      onClick: () => {
                        setMode("periodo");
                        setPeriod("week");
                      },
                    },
                    {
                      label: "Mês",
                      onClick: () => {
                        setMode("periodo");
                        setPeriod("month");
                      },
                    },
                    { label: "Diário", onClick: () => setMode("diario") },
                  ]}
                />

                {mode === "ano" && (
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
                )}

                {mode === "periodo" && (
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

                {mode === "diario" && (
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={dailyMonth}
                      onChange={(e) => setDailyMonth(Number(e.target.value))}
                      className="h-11 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                    >
                      {MONTH_NAMES_FULL.map((label, i) => (
                        <option key={label} value={i + 1}>
                          {label}
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      value={dailyYear}
                      onChange={(e) =>
                        setDailyYear(Number(e.target.value) || dailyYear)
                      }
                      className="h-11 w-24 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                    />

                    <div className="flex gap-2 rounded-xl border border-[var(--border)] p-1">
                      <button
                        type="button"
                        onClick={() => setDailyFilter("dia")}
                        className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                          dailyFilter === "dia"
                            ? "bg-[var(--primary)] text-[var(--primary-contrast)]"
                            : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                        }`}
                      >
                        Dia
                      </button>

                      <button
                        type="button"
                        onClick={() => setDailyFilter("semana")}
                        className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                          dailyFilter === "semana"
                            ? "bg-[var(--primary)] text-[var(--primary-contrast)]"
                            : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                        }`}
                      >
                        Semana
                      </button>
                    </div>

                    {dailyFilter === "semana" && dailyFlow && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setDailyWeek((w) => Math.max(1, w - 1))
                          }
                          aria-label="Semana anterior"
                          className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)]"
                        >
                          <ChevronLeft size={16} />
                        </button>

                        <span className="min-w-20 text-center text-sm font-medium text-[var(--text-primary)]">
                          Semana {dailyWeek}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            setDailyWeek((w) =>
                              Math.min(
                                dailyFlow.days[dailyFlow.days.length - 1]
                                  .week,
                                w + 1
                              )
                            )
                          }
                          aria-label="Próxima semana"
                          className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)]"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </header>

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

            {mode === "diario" && dailyError && (
              <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                {dailyError}
              </div>
            )}

            {mode === "diario" && !dailyLoading && dailyFlow && (
              <DailySummaryCards
                totals={dailyTotals}
                filterMode={dailyFilter}
              />
            )}
          </>
        }
      >
        {mode === "diario" ? (
          <DailyCashFlowView
            days={dailyFilteredDays}
            loading={dailyLoading}
          />
        ) : mode === "periodo" ? (
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
    </PageAccessGuard>
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
            {
              label: "Recebido",
              value: receivable?.settled,
              color: "text-[var(--success)]",
            },
            {
              label: "A receber (previsto)",
              value: receivable?.open,
              color: "text-[var(--primary)]",
            },
            {
              label: "Vencido",
              value: receivable?.overdue,
              color: "text-[var(--danger)]",
            },
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
                <span className={`font-medium ${row.color}`}>
                  {moneyFull(row.value ?? 0)}
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-xl bg-[var(--success-soft)] p-3">
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
            {
              label: "Pago",
              value: payable?.settled,
              color: "text-[var(--primary)]",
            },
            {
              label: "A pagar (previsto)",
              value: payable?.open,
              color: "text-[var(--accent-orange)]",
            },
            {
              label: "Vencido",
              value: payable?.overdue,
              color: "text-[var(--danger)]",
            },
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
                <span className={`font-medium ${row.color}`}>
                  {moneyFull(row.value ?? 0)}
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-xl bg-[var(--danger-soft)] p-3">
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

// ---- Visão diária — dia a dia do mês, com filtro por semana ----

interface DailyRow extends DailyCashFlowDay {
  total: number;
  totalPago: number;
  cumulative: number;
}

/**
 * Acumulativo reinicia do zero a cada lista processada — visão "Dia"
 * processa o mês inteiro (acumulado contínuo), visão "Semana" processa
 * só os dias daquela semana (acumulado reinicia), mesmo comportamento
 * de uma planilha com SUBTOTAL + AutoFiltro por semana.
 */
function buildDailyRows(days: DailyCashFlowDay[]): DailyRow[] {
  let cumulative = 0;

  return days.map((d) => {
    cumulative += d.receivablePrevisto - d.payablePrevisto;

    return {
      ...d,
      total: d.receivablePrevisto + d.receivableRecebido,
      totalPago: d.payablePrevisto + d.payablePago,
      cumulative,
    };
  });
}

/** Cards de total — ficam no cabeçalho fixo da página (fora da área que rola), por isso são um componente à parte de `DailyCashFlowView`. */
function DailySummaryCards({
  totals,
  filterMode,
}: {
  totals: { receivable: number; payable: number };
  filterMode: "dia" | "semana";
}) {
  const label = filterMode === "semana" ? "semana" : "mês";
  const diff = totals.receivable - totals.payable;

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-xl bg-[var(--success-soft)] px-3 py-2">
        <p className="text-xs text-[var(--text-muted)]">
          Total do {label} — a receber (previsto)
        </p>
        <p className="text-base font-bold text-[var(--success)]">
          {moneyFull(totals.receivable)}
        </p>
      </div>

      <div className="rounded-xl bg-[var(--danger-soft)] px-3 py-2">
        <p className="text-xs text-[var(--text-muted)]">
          Total do {label} — a pagar (previsto)
        </p>
        <p className="text-base font-bold text-[var(--danger)]">
          {moneyFull(totals.payable)}
        </p>
      </div>

      <div className="rounded-xl bg-[var(--surface-hover)] px-3 py-2">
        <p className="text-xs text-[var(--text-muted)]">Diferença</p>
        <p
          className={`text-base font-bold ${
            diff >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"
          }`}
        >
          {moneyFull(diff)}
        </p>
      </div>
    </div>
  );
}

function DailyCashFlowView({
  days,
  loading,
}: {
  days: DailyCashFlowDay[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className="h-10 animate-pulse rounded-xl bg-[var(--surface-hover)]"
          />
        ))}
      </div>
    );
  }

  const rows = buildDailyRows(days);

  return (
    <div>
      {/* Sem overflow-x-auto aqui: esse wrapper vira sua própria caixa de
          rolagem (mesmo só configurando o eixo x) e o sticky do cabeçalho
          gruda nela em vez de grudar na área que realmente rola
          (o painel do ListPageLayout) — a tabela cabe sem rolagem
          horizontal, então não precisa desse wrapper. */}
      <div>
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 z-10 bg-[var(--table-header-bg)] text-[var(--table-header-fg)]">
            <tr>
              <th rowSpan={2} className="px-3 py-2 font-semibold">
                Sem.
              </th>
              <th rowSpan={2} className="px-3 py-2 font-semibold">
                Dia
              </th>
              <th
                colSpan={3}
                className="border-l border-white/20 px-3 py-2 text-center font-semibold uppercase tracking-wide text-[var(--success)]"
              >
                A receber
              </th>
              <th
                colSpan={3}
                className="border-l border-white/20 px-3 py-2 text-center font-semibold uppercase tracking-wide text-[var(--danger)]"
              >
                A pagar
              </th>
              <th
                rowSpan={2}
                className="border-l border-white/20 px-3 py-2 text-right font-semibold"
              >
                Acumulativo
              </th>
            </tr>
            <tr>
              <th className="border-l border-white/20 px-3 py-1.5 text-right font-medium">
                Previsto
              </th>
              <th className="px-3 py-1.5 text-right font-medium">
                Recebido
              </th>
              <th className="px-3 py-1.5 text-right font-medium">Total</th>
              <th className="border-l border-white/20 px-3 py-1.5 text-right font-medium">
                Previsto
              </th>
              <th className="px-3 py-1.5 text-right font-medium">Pago</th>
              <th className="px-3 py-1.5 text-right font-medium">
                Total pago
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr
                key={row.day}
                className="border-t border-[var(--border)]"
              >
                <td className="px-3 py-2 text-[var(--text-muted)]">
                  {row.week}
                </td>
                <td className="px-3 py-2 font-medium text-[var(--text-primary)]">
                  {row.day}
                </td>
                <td className="border-l border-[var(--border)] px-3 py-2 text-right text-[var(--text-secondary)]">
                  {row.receivablePrevisto > 0
                    ? moneyFull(row.receivablePrevisto)
                    : ""}
                </td>
                <td className="px-3 py-2 text-right text-[var(--text-secondary)]">
                  {row.receivableRecebido > 0
                    ? moneyFull(row.receivableRecebido)
                    : ""}
                </td>
                <td className="px-3 py-2 text-right font-medium text-[var(--success)]">
                  {row.total > 0 ? moneyFull(row.total) : ""}
                </td>
                <td className="border-l border-[var(--border)] px-3 py-2 text-right text-[var(--text-secondary)]">
                  {row.payablePrevisto > 0
                    ? moneyFull(row.payablePrevisto)
                    : ""}
                </td>
                <td className="px-3 py-2 text-right text-[var(--text-secondary)]">
                  {row.payablePago > 0 ? moneyFull(row.payablePago) : ""}
                </td>
                <td className="px-3 py-2 text-right font-medium text-[var(--danger)]">
                  {row.totalPago > 0 ? moneyFull(row.totalPago) : ""}
                </td>
                <td
                  className={`border-l border-[var(--border)] px-3 py-2 text-right font-bold ${
                    row.cumulative < 0
                      ? "text-[var(--danger)]"
                      : row.cumulative > 0
                        ? "text-[var(--success)]"
                        : "text-[var(--text-muted)]"
                  }`}
                >
                  {moneyFull(row.cumulative)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
