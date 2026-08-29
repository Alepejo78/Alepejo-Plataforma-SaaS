"use client";

import { Plus, Trash2 } from "lucide-react";

import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { calculateDueDatePreview } from "@/lib/dueDate";

/**
 * Grade de parcelas editável (dias/vencimento/valor) — mesmo
 * componente usado em Orçamento, Pedido de Venda e Venda (mesma
 * lógica que já existia em Compras: `plannedInstallments`, refletida
 * no documento seguinte da cadeia).
 */
export interface InstallmentRow {
  /** Dias a partir da data base do documento — só ajuda a calcular o vencimento. */
  days: string;
  dueDate: string;
  amount: number;
}

export function toDateInput(iso: string) {
  return iso.slice(0, 10);
}

/** Dias entre duas datas (YYYY-MM-DD) — usado só pra popular o campo "Dias" ao abrir um documento já com parcelas planejadas. */
export function daysBetween(
  fromIso: string | undefined,
  toIso: string
) {
  if (!fromIso) {
    return "";
  }

  const from = new Date(`${fromIso}T00:00:00Z`).getTime();
  const to = new Date(`${toIso}T00:00:00Z`).getTime();
  const days = Math.round((to - from) / 86400000);

  return days >= 0 ? String(days) : "";
}

/** Divide o total entre as parcelas — a última absorve o arredondamento, igual ao backend. */
export function buildInstallmentAmounts(
  totalAmount: number,
  count: number
): number[] {
  const base = Math.floor((totalAmount / count) * 100) / 100;
  const amounts: number[] = [];
  let allocated = 0;

  for (let i = 1; i <= count; i++) {
    const isLast = i === count;
    const amount = isLast
      ? Math.round((totalAmount - allocated) * 100) / 100
      : base;

    allocated += amount;
    amounts.push(amount);
  }

  return amounts;
}

/** Gera N parcelas já calculadas (30/60/90... dias, valor dividido) — ponto de partida editável. */
export function buildInstallmentRows(
  baseDateIso: string | undefined,
  termDays: number,
  count: number,
  totalAmount: number
): InstallmentRow[] {
  const amounts = buildInstallmentAmounts(totalAmount, count);

  return Array.from({ length: count }, (_, i) => {
    const days = termDays * (i + 1);

    return {
      days: String(days),
      dueDate: toDateInput(
        calculateDueDatePreview(baseDateIso, days).toISOString()
      ),
      amount: amounts[i],
    };
  });
}

/** Recalcula o vencimento de uma linha a partir de "Dias" — usado pelo onUpdate de cada tela. */
export function recalcDueDateFromDays(
  baseDateIso: string | undefined,
  days: string
) {
  return toDateInput(
    calculateDueDatePreview(baseDateIso, Number(days) || 0).toISOString()
  );
}

const fieldClass = `
  h-11 w-full rounded-xl border border-[var(--border)]
  bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)]
  outline-none transition-colors focus:border-[var(--primary)]
`;

const labelClass =
  "mb-1 block text-sm font-medium text-[var(--text-secondary)]";

function money(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function InstallmentsEditor({
  installments,
  onUpdate,
  onAdd,
  onRemove,
  total,
}: {
  installments: InstallmentRow[];
  onUpdate: (index: number, patch: Partial<InstallmentRow>) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  /** Total dos itens — usado como valor da parcela única e na conferência de soma. */
  total: number;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className={labelClass}>Parcelas</label>

        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
        >
          <Plus size={14} />
          Adicionar parcela
        </button>
      </div>

      <div className="space-y-2">
        {installments.map((row, index) => {
          const singleInstallment = installments.length === 1;

          return (
            <div
              key={index}
              className="grid grid-cols-12 items-center gap-2 rounded-xl border border-[var(--border)] p-2"
            >
              <input
                type="number"
                min={0}
                placeholder="Dias"
                title="Dias a partir da data base — calcula o vencimento"
                className={`${fieldClass} col-span-2`}
                value={row.days}
                onChange={(e) =>
                  onUpdate(index, { days: e.target.value })
                }
              />

              <input
                type="date"
                className={`${fieldClass} col-span-4`}
                value={row.dueDate}
                onChange={(e) =>
                  onUpdate(index, { dueDate: e.target.value })
                }
              />

              <CurrencyInput
                placeholder="Valor"
                wrapperClassName="col-span-5"
                className={fieldClass}
                disabled={singleInstallment}
                value={singleInstallment ? total : row.amount}
                onChange={(value) => onUpdate(index, { amount: value })}
              />

              <button
                type="button"
                onClick={() => onRemove(index)}
                disabled={installments.length === 1}
                title="Remover parcela"
                aria-label="Remover parcela"
                className="col-span-1 flex justify-center py-2 text-[var(--text-secondary)] transition-colors hover:text-[var(--danger)] disabled:opacity-30"
              >
                <Trash2 size={16} />
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex justify-end text-sm font-semibold text-[var(--text-primary)]">
        Total:{" "}
        {money(
          installments.length === 1
            ? total
            : installments.reduce(
                (sum, row) => sum + (row.amount || 0),
                0
              )
        )}
      </div>

      {installments.length > 1 &&
        (() => {
          const sum = installments.reduce(
            (acc, row) => acc + (row.amount || 0),
            0
          );

          return (
            <p
              className={`mt-1 text-right text-xs ${
                Math.abs(sum - total) > 0.01
                  ? "text-[var(--danger)]"
                  : "text-[var(--text-muted)]"
              }`}
            >
              Precisa bater com o total dos itens ({money(total)}).
            </p>
          );
        })()}
    </div>
  );
}
