"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Eye, Plus, X } from "lucide-react";

import { AppShell } from "@/components";
import { Can } from "@/components/auth/Can";
import { ListPageLayout } from "@/components/layout/ListPageLayout";

import {
  THIRTEENTH_STATUS_LABELS,
  formatThirteenthNumber,
  thirteenthSalaryService,
  type ThirteenthSalary,
} from "@/services/thirteenth-salary.service";
import type { PayrollStatus } from "@/services/payroll.service";

function num(value: string | number | null | undefined) {
  return Number(value ?? 0);
}

function money(value: string | number | null | undefined) {
  return num(value).toLocaleString("pt-BR", {
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

const fieldClass = `
  h-11 w-full rounded-xl border border-[var(--border)]
  bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)]
  outline-none transition-colors focus:border-[var(--primary)]
`;

const labelClass =
  "mb-1 block text-sm font-medium text-[var(--text-secondary)]";

const STATUS_BADGE_CLASS: Record<PayrollStatus, string> = {
  DRAFT: "bg-[var(--surface-hover)] text-[var(--text-secondary)]",
  APPROVED: "bg-[var(--success-soft)] text-[var(--success)]",
  CANCELLED: "bg-[var(--danger-soft)] text-[var(--danger)]",
};

const now = new Date();

export default function DecimoTerceiroPage() {
  const [list, setList] = useState<ThirteenthSalary[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [generateOpen, setGenerateOpen] = useState(false);
  const [year, setYear] = useState(now.getFullYear());
  const [installment, setInstallment] = useState<1 | 2>(1);
  const [paymentDate, setPaymentDate] = useState("");
  const [observation, setObservation] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setListError("");

    try {
      const result = await thirteenthSalaryService.list();

      setList(result);
    } catch (err) {
      setListError(
        extractMessage(err, "Não foi possível carregar o 13º salário.")
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openGenerate() {
    setYear(now.getFullYear());
    setInstallment(1);
    setPaymentDate("");
    setObservation("");
    setFormError("");
    setGenerateOpen(true);
  }

  async function generate() {
    setSaving(true);
    setFormError("");

    try {
      const created = await thirteenthSalaryService.generate({
        year,
        installment,
        paymentDate: paymentDate || undefined,
        observation: observation || undefined,
      });

      setGenerateOpen(false);
      window.location.href = `/erp/rh/decimo-terceiro/${created.id}`;
    } catch (err) {
      setFormError(
        extractMessage(err, "Não foi possível gerar o 13º salário.")
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell workspaceLabel="13º Salário">
      <ListPageLayout
        header={
          <>
            <header>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                    13º Salário
                  </h1>

                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    1ª parcela sem desconto (adiantamento) e 2ª parcela com
                    INSS/IRRF sobre o valor total, calculados pelos avos de
                    cada colaborador.
                  </p>
                </div>

                <Can permission="thirteenth-salary.generate">
                  <button
                    type="button"
                    onClick={openGenerate}
                    className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)]"
                  >
                    <Plus size={18} />
                    Gerar parcela
                  </button>
                </Can>
              </div>
            </header>

            {listError && (
              <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                {listError}
              </div>
            )}
          </>
        }
      >
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-xl bg-[var(--surface-hover)]"
              />
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-medium text-[var(--text-primary)]">
              Nenhuma parcela gerada
            </p>

            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Use &quot;Gerar parcela&quot; para calcular a 1ª ou 2ª parcela do
              ano.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-[var(--surface-hover)] text-[var(--text-secondary)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Número</th>
                  <th className="px-4 py-3 font-semibold">Ano</th>
                  <th className="px-4 py-3 font-semibold">Parcela</th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Colaboradores
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Total líquido
                  </th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>

              <tbody>
                {list.map((t) => (
                  <tr key={t.id} className="border-t border-[var(--border)]">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-[var(--text-primary)]">
                      {formatThirteenthNumber(t.number)}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-[var(--text-secondary)]">
                      {t.year}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-[var(--text-secondary)]">
                      {t.installment}ª parcela
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-right text-[var(--text-secondary)]">
                      {t.items.length}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-[var(--text-primary)]">
                      {money(t.totalNet)}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE_CLASS[t.status]}`}
                      >
                        {THIRTEENTH_STATUS_LABELS[t.status]}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/erp/rh/decimo-terceiro/${t.id}`}
                          title="Ver"
                          aria-label="Ver"
                          className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                        >
                          <Eye size={16} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ListPageLayout>

      {generateOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-8 w-full max-w-4xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                Gerar parcela de 13º salário
              </h2>

              <button
                type="button"
                onClick={() => setGenerateOpen(false)}
                aria-label="Fechar"
                className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className={labelClass}>Ano</label>

                  <input
                    type="number"
                    className={fieldClass}
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                  />
                </div>

                <div>
                  <label className={labelClass}>Parcela</label>

                  <select
                    className={fieldClass}
                    value={installment}
                    onChange={(e) =>
                      setInstallment(Number(e.target.value) as 1 | 2)
                    }
                  >
                    <option value={1}>1ª parcela (sem desconto)</option>
                    <option value={2}>2ª parcela (com INSS/IRRF)</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>
                    Data de pagamento (opcional)
                  </label>

                  <input
                    type="date"
                    className={fieldClass}
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className={labelClass}>Observação</label>

                  <input
                    className={fieldClass}
                    value={observation}
                    onChange={(e) => setObservation(e.target.value)}
                  />
                </div>
              </div>

              <p className="text-sm text-[var(--text-muted)]">
                Calcula os avos (meses trabalhados no ano) de todos os
                colaboradores ativos. A 1ª parcela paga 50% do valor
                proporcional sem desconto. A 2ª parcela paga o restante,
                com INSS e IRRF calculados sobre o valor total do 13º.
                Nada é enviado ao Financeiro até aprovar.
              </p>

              {formError && (
                <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                  {formError}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setGenerateOpen(false)}
                  className="rounded-xl border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--text-secondary)]"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void generate()}
                  className="rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] disabled:opacity-60"
                >
                  {saving ? "Gerando..." : "Gerar parcela"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
