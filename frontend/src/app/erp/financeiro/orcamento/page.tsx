"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { AppShell } from "@/components";
import { ListPageLayout } from "@/components/layout/ListPageLayout";
import { ExportButton } from "@/components/ui/ExportButton";
import { CurrencyInput } from "@/components/ui/CurrencyInput";

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

function pct(diff: number, planned: number) {
  if (!planned) {
    return "—";
  }

  return `${((diff / planned) * 100).toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
  })}%`;
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

const inputClass = `
  w-full rounded-md border border-transparent bg-transparent px-1 py-1
  text-right text-xs font-bold text-[var(--text-primary)] outline-none
  transition-colors hover:border-[var(--border)]
  focus:border-[var(--primary)] focus:bg-[var(--surface)]
`;

export default function OrcamentoPage() {
  const exportTableRef = useRef<HTMLTableElement>(null);
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [budget, setBudget] = useState<BudgetYear | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [pending, setPending] = useState<Record<string, number>>(
    {}
  );

  const load = useCallback(async (targetYear: number) => {
    setLoading(true);
    setError("");

    try {
      const result = await budgetService.getYear(targetYear);

      setBudget(result);
    } catch (err) {
      setError(
        extractMessage(
          err,
          "Não foi possível carregar o orçamento."
        )
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(year);
  }, [year, load]);

  async function savePlanned(
    month: number,
    type: "RECEITA" | "DESPESA",
    plannedAmount: number
  ) {
    const key = `${month}-${type}`;
    setSavingKey(key);

    try {
      await budgetService.upsert({
        year,
        month,
        type,
        plannedAmount,
      });

      await load(year);

      setPending((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    } catch (err) {
      setError(
        extractMessage(
          err,
          "Não foi possível salvar o valor orçado."
        )
      );
    } finally {
      setSavingKey(null);
    }
  }

  const months = budget?.months ?? [];
  const totals = budget?.totals;

  return (
    <AppShell workspaceLabel="Financeiro">
      <ListPageLayout
        header={
          <>
            <header className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                  Orçamento
                </h1>

                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Compare o planejado com o realizado. Clique nos
                  valores de "Receita orçada" e "Despesas
                  orçadas" para editar.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <ExportButton
                  tableRef={exportTableRef}
                  filename="orcamento"
                  sheetName="Orçamento"
                />

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
                {/* Receita */}
                <tr className="border-t border-[var(--border)] bg-[var(--surface-hover)]">
                  <td className="whitespace-nowrap px-4 py-2.5 font-bold text-[var(--text-primary)]">
                    Receita orçada
                  </td>

                  {months.map((m) => {
                    const key = `${m.month}-RECEITA`;

                    return (
                      <td
                        key={m.month}
                        className="px-1 py-1.5"
                      >
                        <CurrencyInput
                          value={
                            pending[key] ??
                            m.receivable.planned
                          }
                          disabled={savingKey === key}
                          onChange={(value) =>
                            setPending((prev) => ({
                              ...prev,
                              [key]: value,
                            }))
                          }
                          onBlur={() =>
                            void savePlanned(
                              m.month,
                              "RECEITA",
                              pending[key] ??
                                m.receivable.planned
                            )
                          }
                          className={inputClass}
                          showPrefix={false}
                        />
                      </td>
                    );
                  })}

                  <td className="whitespace-nowrap border-l border-[var(--border)] px-4 py-2.5 text-right font-bold text-[var(--text-primary)]">
                    {money(totals?.receivable.planned ?? 0)}
                  </td>
                </tr>

                <tr className="border-t border-[var(--border)]">
                  <td className="whitespace-nowrap px-4 py-2.5 pl-8 font-bold text-[var(--success)]">
                    Receita realizada
                  </td>

                  {months.map((m) => (
                    <td
                      key={m.month}
                      className="whitespace-nowrap px-4 py-2.5 text-right font-bold text-[var(--success)]"
                    >
                      {money(m.receivable.realized)}
                    </td>
                  ))}

                  <td className="whitespace-nowrap border-l border-[var(--border)] px-4 py-2.5 text-right font-bold text-[var(--success)]">
                    {money(totals?.receivable.realized ?? 0)}
                  </td>
                </tr>

                <tr className="border-t border-[var(--border)]">
                  <td className="whitespace-nowrap px-4 py-2.5 pl-8 font-bold text-[var(--text-secondary)]">
                    % da meta
                  </td>

                  {months.map((m) => {
                    const diff =
                      m.receivable.realized -
                      m.receivable.planned;

                    return (
                      <td
                        key={m.month}
                        className={`whitespace-nowrap px-4 py-2.5 text-right font-bold ${
                          diff >= 0
                            ? "text-[var(--success)]"
                            : "text-[var(--danger)]"
                        }`}
                      >
                        {pct(diff, m.receivable.planned)}
                      </td>
                    );
                  })}

                  <td
                    className={`whitespace-nowrap border-l border-[var(--border)] px-4 py-2.5 text-right font-bold ${
                      (totals?.receivable.realized ?? 0) -
                        (totals?.receivable.planned ?? 0) >=
                      0
                        ? "text-[var(--success)]"
                        : "text-[var(--danger)]"
                    }`}
                  >
                    {pct(
                      (totals?.receivable.realized ?? 0) -
                        (totals?.receivable.planned ?? 0),
                      totals?.receivable.planned ?? 0
                    )}
                  </td>
                </tr>

                <tr>
                  <td
                    colSpan={14}
                    className="border-t border-[var(--border)]"
                  />
                </tr>

                {/* Despesas */}
                <tr className="border-t border-[var(--border)] bg-[var(--surface-hover)]">
                  <td className="whitespace-nowrap px-4 py-2.5 font-bold text-[var(--text-primary)]">
                    Despesas orçadas
                  </td>

                  {months.map((m) => {
                    const key = `${m.month}-DESPESA`;

                    return (
                      <td
                        key={m.month}
                        className="px-1 py-1.5"
                      >
                        <CurrencyInput
                          value={
                            pending[key] ?? m.payable.planned
                          }
                          disabled={savingKey === key}
                          onChange={(value) =>
                            setPending((prev) => ({
                              ...prev,
                              [key]: value,
                            }))
                          }
                          onBlur={() =>
                            void savePlanned(
                              m.month,
                              "DESPESA",
                              pending[key] ?? m.payable.planned
                            )
                          }
                          className={inputClass}
                          showPrefix={false}
                        />
                      </td>
                    );
                  })}

                  <td className="whitespace-nowrap border-l border-[var(--border)] px-4 py-2.5 text-right font-bold text-[var(--text-primary)]">
                    {money(totals?.payable.planned ?? 0)}
                  </td>
                </tr>

                <tr className="border-t border-[var(--border)]">
                  <td className="whitespace-nowrap px-4 py-2.5 pl-8 font-bold text-[var(--warning)]">
                    Despesas pagas
                  </td>

                  {months.map((m) => (
                    <td
                      key={m.month}
                      className="whitespace-nowrap px-4 py-2.5 text-right font-bold text-[var(--warning)]"
                    >
                      {money(m.payable.realized)}
                    </td>
                  ))}

                  <td className="whitespace-nowrap border-l border-[var(--border)] px-4 py-2.5 text-right font-bold text-[var(--warning)]">
                    {money(totals?.payable.realized ?? 0)}
                  </td>
                </tr>

                <tr>
                  <td
                    colSpan={14}
                    className="border-t border-[var(--border)]"
                  />
                </tr>

                <tr className="bg-[var(--surface-hover)]">
                  <td className="whitespace-nowrap px-4 py-2.5 font-bold text-[var(--text-primary)]">
                    Lucro/Perda
                  </td>

                  {months.map((m) => {
                    const value =
                      m.receivable.realized - m.payable.realized;

                    return (
                      <td
                        key={m.month}
                        className={`whitespace-nowrap px-4 py-2.5 text-right font-bold ${
                          value < 0
                            ? "text-[var(--danger)]"
                            : "text-[var(--success)]"
                        }`}
                      >
                        {money(value)}
                      </td>
                    );
                  })}

                  <td
                    className={`whitespace-nowrap border-l border-[var(--border)] px-4 py-2.5 text-right font-bold ${
                      (totals?.receivable.realized ?? 0) -
                        (totals?.payable.realized ?? 0) <
                      0
                        ? "text-[var(--danger)]"
                        : "text-[var(--success)]"
                    }`}
                  >
                    {money(
                      (totals?.receivable.realized ?? 0) -
                        (totals?.payable.realized ?? 0)
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </ListPageLayout>
    </AppShell>
  );
}
