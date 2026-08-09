"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { AppShell } from "@/components";
import { ListPageLayout } from "@/components/layout/ListPageLayout";

import {
  financialEntryService,
  type CashFlow,
  type CashFlowBucket,
} from "@/services/financial-entry.service";

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

function sum(values: number[]) {
  return values.reduce((acc, v) => acc + v, 0);
}

export default function FluxoCaixaPage() {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [cashFlow, setCashFlow] = useState<CashFlow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (targetYear: number) => {
    setLoading(true);
    setError("");

    try {
      const result = await financialEntryService.getCashFlow(
        targetYear
      );

      setCashFlow(result);
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

  const receivableRows = cashFlow
    ? bucketRows(
        cashFlow.months,
        "receivable",
        "Total receita",
        "Recebido",
        "success",
        "A receber",
        "info"
      )
    : [];

  const payableRows = cashFlow
    ? bucketRows(
        cashFlow.months,
        "payable",
        "Total despesas",
        "Pago",
        "success",
        "A pagar",
        "warning"
      )
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
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="h-10 animate-pulse rounded-xl bg-[var(--surface-hover)]"
              />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
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
                {receivableRows.map((row) => (
                  <RowLine key={row.label} row={row} />
                ))}

                <tr>
                  <td
                    colSpan={14}
                    className="border-t border-[var(--border)]"
                  />
                </tr>

                {payableRows.map((row) => (
                  <RowLine key={row.label} row={row} />
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
  const total = row.label === "Saldo acumulado"
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
              : TONE_CLASS[row.tone]
          }`}
        >
          {money(value)}
        </td>
      ))}

      <td
        className={`whitespace-nowrap border-l border-[var(--border)] px-4 py-2.5 text-right font-bold ${
          isBalance
            ? total < 0
              ? TONE_CLASS.danger
              : total > 0
                ? TONE_CLASS.success
                : TONE_CLASS.neutral
            : TONE_CLASS[row.tone]
        }`}
      >
        {money(total)}
      </td>
    </tr>
  );
}
