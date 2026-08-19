"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Eye, FileText, Plus, X } from "lucide-react";

import { AppShell } from "@/components";
import { Can } from "@/components/auth/Can";
import { ListPageLayout } from "@/components/layout/ListPageLayout";

import {
  PAYROLL_STATUS_LABELS,
  formatPayrollNumber,
  payrollService,
  type Payroll,
  type PayrollStatus,
} from "@/services/payroll.service";

const MONTH_LABELS = [
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

export default function FolhaPagamentoPage() {
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [generateOpen, setGenerateOpen] = useState(false);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [paymentDate, setPaymentDate] = useState("");
  const [observation, setObservation] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setListError("");

    try {
      const result = await payrollService.list();

      setPayrolls(result);
    } catch (err) {
      setListError(
        extractMessage(err, "Não foi possível carregar as folhas de pagamento.")
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
    setMonth(now.getMonth() + 1);
    setPaymentDate("");
    setObservation("");
    setFormError("");
    setGenerateOpen(true);
  }

  async function generate() {
    setSaving(true);
    setFormError("");

    try {
      const created = await payrollService.generate({
        competenceYear: year,
        competenceMonth: month,
        paymentDate: paymentDate || undefined,
        observation: observation || undefined,
      });

      setGenerateOpen(false);
      window.location.href = `/erp/rh/folha/${created.id}`;
    } catch (err) {
      setFormError(
        extractMessage(err, "Não foi possível gerar a folha de pagamento.")
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell workspaceLabel="Folha de Pagamento">
      <ListPageLayout
        header={
          <>
            <header>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                    Folha de Pagamento
                  </h1>

                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    Salário, horas extras, faltas, INSS/IRRF/FGTS calculados
                    a partir do Ponto e das faltas de cada competência.
                  </p>
                </div>

                <div className="flex gap-2">
                  <Link
                    href="/erp/rh/folha/relatorio"
                    target="_blank"
                    className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                  >
                    <FileText size={18} />
                    Relatório de encargos
                  </Link>

                  <Can permission="payroll.generate">
                    <button
                      type="button"
                      onClick={openGenerate}
                      className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)]"
                    >
                      <Plus size={18} />
                      Gerar folha
                    </button>
                  </Can>
                </div>
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
        ) : payrolls.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-medium text-[var(--text-primary)]">
              Nenhuma folha gerada
            </p>

            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Use &quot;Gerar folha&quot; para calcular a competência atual.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-[var(--surface-hover)] text-[var(--text-secondary)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Número</th>
                  <th className="px-4 py-3 font-semibold">Competência</th>
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
                {payrolls.map((p) => (
                  <tr key={p.id} className="border-t border-[var(--border)]">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-[var(--text-primary)]">
                      {formatPayrollNumber(p.number)}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-[var(--text-secondary)]">
                      {MONTH_LABELS[p.competenceMonth - 1]} /{" "}
                      {p.competenceYear}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-right text-[var(--text-secondary)]">
                      {p.items.length}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-[var(--text-primary)]">
                      {money(p.totalNet)}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE_CLASS[p.status]}`}
                      >
                        {PAYROLL_STATUS_LABELS[p.status]}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/erp/rh/folha/${p.id}`}
                          title="Ver folha"
                          aria-label="Ver folha"
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
                Gerar folha de pagamento
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
                  <label className={labelClass}>Mês</label>

                  <select
                    className={fieldClass}
                    value={month}
                    onChange={(e) => setMonth(Number(e.target.value))}
                  >
                    {MONTH_LABELS.map((label, i) => (
                      <option key={label} value={i + 1}>
                        {label}
                      </option>
                    ))}
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
                Calcula salário, horas extras, faltas injustificadas, Vale
                Transporte, INSS, IRRF e FGTS de todos os colaboradores
                ativos, a partir dos parâmetros fiscais vigentes e do Ponto
                já lançado nesta competência. Nada é enviado ao Financeiro
                até a folha ser aprovada.
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
                  {saving ? "Gerando..." : "Gerar folha"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
