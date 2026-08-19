"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Eye,
  MinusCircle,
  PlusCircle,
  RotateCcw,
  Settings2,
  X,
  XCircle,
} from "lucide-react";

import { AppShell } from "@/components";
import { Can } from "@/components/auth/Can";
import { ListPageLayout } from "@/components/layout/ListPageLayout";
import { CurrencyInput } from "@/components/ui/CurrencyInput";

import {
  THIRTEENTH_ITEM_STATUS_LABELS,
  THIRTEENTH_STATUS_LABELS,
  formatThirteenthNumber,
  thirteenthSalaryService,
  type ThirteenthSalary,
  type ThirteenthSalaryItem,
} from "@/services/thirteenth-salary.service";
import type { PayrollItemStatus, PayrollStatus } from "@/services/payroll.service";

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

const ITEM_STATUS_BADGE_CLASS: Record<PayrollItemStatus, string> = {
  PENDING: "bg-[var(--surface-hover)] text-[var(--text-secondary)]",
  INCLUDED: "bg-[var(--success-soft)] text-[var(--success)]",
  EXCLUDED: "bg-[var(--danger-soft)] text-[var(--danger)]",
};

export default function DecimoTerceiroDetalhePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [thirteenth, setThirteenth] = useState<ThirteenthSalary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [busyId, setBusyId] = useState("");
  const [actionError, setActionError] = useState("");

  const [adjustItem, setAdjustItem] = useState<ThirteenthSalaryItem | null>(null);
  const [otherEarnings, setOtherEarnings] = useState(0);
  const [otherDeductions, setOtherDeductions] = useState(0);
  const [adjustSaving, setAdjustSaving] = useState(false);
  const [adjustError, setAdjustError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await thirteenthSalaryService.getById(id);

      setThirteenth(result);
    } catch (err) {
      setError(extractMessage(err, "Não foi possível carregar o 13º salário."));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  function openAdjust(item: ThirteenthSalaryItem) {
    setAdjustItem(item);
    setOtherEarnings(num(item.otherEarnings));
    setOtherDeductions(num(item.otherDeductions));
    setAdjustError("");
  }

  async function saveAdjust() {
    if (!adjustItem) {
      return;
    }

    setAdjustSaving(true);
    setAdjustError("");

    try {
      await thirteenthSalaryService.adjustItem(id, adjustItem.id, {
        otherEarnings,
        otherDeductions,
      });

      setAdjustItem(null);
      await load();
    } catch (err) {
      setAdjustError(extractMessage(err, "Não foi possível ajustar o item."));
    } finally {
      setAdjustSaving(false);
    }
  }

  async function toggleItem(item: ThirteenthSalaryItem) {
    setBusyId(item.id);
    setActionError("");

    try {
      if (item.status === "EXCLUDED") {
        await thirteenthSalaryService.includeItem(id, item.id);
      } else {
        await thirteenthSalaryService.excludeItem(id, item.id);
      }

      await load();
    } catch (err) {
      setActionError(extractMessage(err, "Não foi possível alterar o item."));
    } finally {
      setBusyId("");
    }
  }

  async function approve() {
    setBusyId("approve");
    setActionError("");

    try {
      await thirteenthSalaryService.approve(id);
      await load();
    } catch (err) {
      setActionError(extractMessage(err, "Não foi possível aprovar."));
    } finally {
      setBusyId("");
    }
  }

  async function cancel() {
    setBusyId("cancel");
    setActionError("");

    try {
      await thirteenthSalaryService.cancel(id);
      await load();
    } catch (err) {
      setActionError(extractMessage(err, "Não foi possível cancelar."));
    } finally {
      setBusyId("");
    }
  }

  async function reverse() {
    setBusyId("reverse");
    setActionError("");

    try {
      await thirteenthSalaryService.reverse(id);
      await load();
    } catch (err) {
      setActionError(
        extractMessage(err, "Não foi possível estornar a aprovação.")
      );
    } finally {
      setBusyId("");
    }
  }

  const isDraft = thirteenth?.status === "DRAFT";
  const isApproved = thirteenth?.status === "APPROVED";

  return (
    <AppShell workspaceLabel="13º Salário">
      <ListPageLayout
        header={
          <>
            <header>
              <Link
                href="/erp/rh/decimo-terceiro"
                className="mb-3 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              >
                <ArrowLeft size={16} />
                Voltar para 13º Salário
              </Link>

              {thirteenth && (
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                        {formatThirteenthNumber(thirteenth.number)}
                      </h1>

                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE_CLASS[thirteenth.status]}`}
                      >
                        {THIRTEENTH_STATUS_LABELS[thirteenth.status]}
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      {thirteenth.year} · {thirteenth.installment}ª parcela ·{" "}
                      {thirteenth.items.length} colaborador(es) · Total
                      líquido {money(thirteenth.totalNet)}
                    </p>
                  </div>

                  {isDraft && (
                    <div className="flex gap-2">
                      <Can permission="thirteenth-salary.cancel">
                        <button
                          type="button"
                          disabled={busyId === "cancel"}
                          onClick={() => void cancel()}
                          className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--danger)] hover:text-[var(--danger)] disabled:opacity-50"
                        >
                          <XCircle size={18} />
                          Cancelar
                        </button>
                      </Can>

                      <Can permission="thirteenth-salary.approve">
                        <button
                          type="button"
                          disabled={busyId === "approve"}
                          onClick={() => void approve()}
                          className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-60"
                        >
                          <Check size={18} />
                          {busyId === "approve"
                            ? "Aprovando..."
                            : "Aprovar (gera títulos a pagar)"}
                        </button>
                      </Can>
                    </div>
                  )}

                  {isApproved && (
                    <Can permission="thirteenth-salary.approve">
                      <button
                        type="button"
                        disabled={busyId === "reverse"}
                        onClick={() => void reverse()}
                        title="Estornar aprovação (volta a rascunho pra editar, apaga os títulos gerados)"
                        className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--danger)] hover:text-[var(--danger)] disabled:opacity-50"
                      >
                        <RotateCcw size={18} />
                        {busyId === "reverse" ? "Estornando..." : "Estornar aprovação"}
                      </button>
                    </Can>
                  )}
                </div>
              )}
            </header>

            {error && (
              <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                {error}
              </div>
            )}

            {actionError && (
              <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                {actionError}
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
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-[var(--surface-hover)] text-[var(--text-secondary)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Colaborador</th>
                  <th className="px-4 py-3 text-right font-semibold">Avos</th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Valor total
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">
                    INSS
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">
                    IRRF
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Líquido
                  </th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>

              <tbody>
                {thirteenth?.items.map((item) => {
                  const busy = busyId === item.id;
                  const excluded = item.status === "EXCLUDED";

                  return (
                    <tr
                      key={item.id}
                      className={`border-t border-[var(--border)] ${excluded ? "opacity-50" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-[var(--text-primary)]">
                          {item.employee?.name}
                        </p>

                        <p className="text-xs text-[var(--text-muted)]">
                          {item.employee?.jobFunction?.name ?? "—"}
                        </p>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-right text-[var(--text-secondary)]">
                        {item.monthsWorked}/12
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-right text-[var(--text-secondary)]">
                        {money(item.grossAmount)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-right text-[var(--text-secondary)]">
                        {money(item.inssAmount)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-right text-[var(--text-secondary)]">
                        {money(item.irrfAmount)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-[var(--text-primary)]">
                        {money(item.netAmount)}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${ITEM_STATUS_BADGE_CLASS[item.status]}`}
                        >
                          {THIRTEENTH_ITEM_STATUS_LABELS[item.status]}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/erp/rh/decimo-terceiro/${id}/recibo/${item.id}`}
                            target="_blank"
                            title="Ver recibo"
                            aria-label="Ver recibo"
                            className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                          >
                            <Eye size={16} />
                          </Link>

                          {isDraft && (
                            <>
                              <Can permission="thirteenth-salary.update">
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => openAdjust(item)}
                                  title="Ajustar proventos/descontos"
                                  aria-label="Ajustar"
                                  className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:opacity-50"
                                >
                                  <Settings2 size={16} />
                                </button>
                              </Can>

                              <Can permission="thirteenth-salary.update">
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => void toggleItem(item)}
                                  title={excluded ? "Reincluir" : "Excluir"}
                                  aria-label={excluded ? "Reincluir" : "Excluir"}
                                  className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--danger)] hover:text-[var(--danger)] disabled:opacity-50"
                                >
                                  {excluded ? (
                                    <PlusCircle size={16} />
                                  ) : (
                                    <MinusCircle size={16} />
                                  )}
                                </button>
                              </Can>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </ListPageLayout>

      {adjustItem && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-8 w-full max-w-3xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                Ajustar — {adjustItem.employee?.name}
              </h2>

              <button
                type="button"
                onClick={() => setAdjustItem(null)}
                aria-label="Fechar"
                className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>
                    Outros proventos (R$)
                  </label>

                  <CurrencyInput
                    className={fieldClass}
                    value={otherEarnings}
                    onChange={setOtherEarnings}
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Outros descontos (R$)
                  </label>

                  <CurrencyInput
                    className={fieldClass}
                    value={otherDeductions}
                    onChange={setOtherDeductions}
                  />
                </div>
              </div>

              {adjustError && (
                <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                  {adjustError}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setAdjustItem(null)}
                  className="rounded-xl border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--text-secondary)]"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={adjustSaving}
                  onClick={() => void saveAdjust()}
                  className="rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] disabled:opacity-60"
                >
                  {adjustSaving ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
