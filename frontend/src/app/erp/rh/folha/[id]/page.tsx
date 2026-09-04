"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Eye,
  Mail,
  MinusCircle,
  PlusCircle,
  RefreshCw,
  RotateCcw,
  Settings2,
  X,
  XCircle,
} from "lucide-react";

import { AppShell } from "@/components";
import { Can } from "@/components/auth/Can";
import { ListPageLayout } from "@/components/layout/ListPageLayout";
import { ExportButton } from "@/components/ui/ExportButton";
import { CurrencyInput } from "@/components/ui/CurrencyInput";

import {
  PAYROLL_CONFIRMATION_STATUS_LABELS,
  PAYROLL_ITEM_STATUS_LABELS,
  PAYROLL_STATUS_LABELS,
  formatPayrollNumber,
  payrollService,
  type Payroll,
  type PayrollItem,
  type PayrollItemStatus,
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

const ITEM_STATUS_BADGE_CLASS: Record<PayrollItemStatus, string> = {
  PENDING: "bg-[var(--surface-hover)] text-[var(--text-secondary)]",
  INCLUDED: "bg-[var(--success-soft)] text-[var(--success)]",
  EXCLUDED: "bg-[var(--danger-soft)] text-[var(--danger)]",
};

export default function FolhaDetalhePage() {
  const params = useParams<{ id: string }>();
  const payrollId = params.id;
  const exportTableRef = useRef<HTMLTableElement>(null);

  const [payroll, setPayroll] = useState<Payroll | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [busyId, setBusyId] = useState("");
  const [actionError, setActionError] = useState("");

  const [adjustItem, setAdjustItem] = useState<PayrollItem | null>(null);
  const [otherEarnings, setOtherEarnings] = useState(0);
  const [otherDeductions, setOtherDeductions] = useState(0);
  const [adjustSaving, setAdjustSaving] = useState(false);
  const [adjustError, setAdjustError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await payrollService.getById(payrollId);

      setPayroll(result);
    } catch (err) {
      setError(
        extractMessage(err, "Não foi possível carregar a folha de pagamento.")
      );
    } finally {
      setLoading(false);
    }
  }, [payrollId]);

  useEffect(() => {
    void load();
  }, [load]);

  function openAdjust(item: PayrollItem) {
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
      await payrollService.adjustItem(payrollId, adjustItem.id, {
        otherEarnings,
        otherDeductions,
      });

      setAdjustItem(null);
      await load();
    } catch (err) {
      setAdjustError(
        extractMessage(err, "Não foi possível ajustar o item.")
      );
    } finally {
      setAdjustSaving(false);
    }
  }

  async function recalculateItem(itemId: string) {
    setBusyId(itemId);
    setActionError("");

    try {
      await payrollService.recalculateItem(payrollId, itemId);
      await load();
    } catch (err) {
      setActionError(
        extractMessage(err, "Não foi possível recalcular o item.")
      );
    } finally {
      setBusyId("");
    }
  }

  async function toggleItem(item: PayrollItem) {
    setBusyId(item.id);
    setActionError("");

    try {
      if (item.status === "EXCLUDED") {
        await payrollService.includeItem(payrollId, item.id);
      } else {
        await payrollService.excludeItem(payrollId, item.id);
      }

      await load();
    } catch (err) {
      setActionError(
        extractMessage(err, "Não foi possível alterar o item.")
      );
    } finally {
      setBusyId("");
    }
  }

  async function confirmItem(item: PayrollItem) {
    if (
      !window.confirm(
        `Confirmar que "${item.employee?.name}" recebeu este holerite? Isso registra a confirmação como assinatura digital.`
      )
    ) {
      return;
    }

    setBusyId(item.id);
    setActionError("");

    try {
      await payrollService.confirmItem(payrollId, item.id);
      await load();
    } catch (err) {
      setActionError(
        extractMessage(err, "Não foi possível confirmar o holerite.")
      );
    } finally {
      setBusyId("");
    }
  }

  async function sendConfirmation(item: PayrollItem) {
    setBusyId(item.id);
    setActionError("");

    try {
      const result = await payrollService.sendConfirmation(
        payrollId,
        item.id
      );

      const channelLabel = result.channels
        .map((c) => (c === "email" ? "e-mail" : "WhatsApp"))
        .join(" e ");

      window.alert(
        result.sent
          ? `Link de confirmação enviado por ${channelLabel}.`
          : "Não foi possível enviar por nenhum canal — confira se o e-mail/WhatsApp do colaborador está cadastrado."
      );

      await load();
    } catch (err) {
      setActionError(
        extractMessage(
          err,
          "Não foi possível enviar o link de confirmação."
        )
      );
    } finally {
      setBusyId("");
    }
  }

  async function approve() {
    setBusyId("approve");
    setActionError("");

    try {
      await payrollService.approve(payrollId);
      await load();
    } catch (err) {
      setActionError(
        extractMessage(err, "Não foi possível aprovar a folha.")
      );
    } finally {
      setBusyId("");
    }
  }

  async function cancel() {
    setBusyId("cancel");
    setActionError("");

    try {
      await payrollService.cancel(payrollId);
      await load();
    } catch (err) {
      setActionError(
        extractMessage(err, "Não foi possível cancelar a folha.")
      );
    } finally {
      setBusyId("");
    }
  }

  async function reverse() {
    setBusyId("reverse");
    setActionError("");

    try {
      await payrollService.reverse(payrollId);
      await load();
    } catch (err) {
      setActionError(
        extractMessage(err, "Não foi possível estornar a aprovação.")
      );
    } finally {
      setBusyId("");
    }
  }

  const isDraft = payroll?.status === "DRAFT";
  const isApproved = payroll?.status === "APPROVED";

  return (
    <AppShell workspaceLabel="Folha de Pagamento">
      <ListPageLayout
        header={
          <>
            <header>
              <Link
                href="/erp/rh/folha"
                className="mb-3 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              >
                <ArrowLeft size={16} />
                Voltar para Folha de Pagamento
              </Link>

              {payroll && (
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                        {formatPayrollNumber(payroll.number)}
                      </h1>

                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE_CLASS[payroll.status]}`}
                      >
                        {PAYROLL_STATUS_LABELS[payroll.status]}
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      Competência {MONTH_LABELS[payroll.competenceMonth - 1]}{" "}
                      / {payroll.competenceYear} ·{" "}
                      {payroll.items.length} colaborador(es) · Total líquido{" "}
                      {money(payroll.totalNet)}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <ExportButton
                      tableRef={exportTableRef}
                      filename={`folha-${formatPayrollNumber(payroll.number)}`}
                      sheetName="Folha de pagamento"
                    />
                  </div>

                  {isDraft && (
                    <div className="flex gap-2">
                      <Can permission="payroll.cancel">
                        <button
                          type="button"
                          disabled={busyId === "cancel"}
                          onClick={() => void cancel()}
                          className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--danger)] transition-colors hover:border-[var(--danger)] hover:bg-[var(--danger-soft)] disabled:opacity-50"
                        >
                          <XCircle size={18} />
                          Cancelar folha
                        </button>
                      </Can>

                      <Can permission="payroll.approve">
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
                    <Can permission="payroll.approve">
                      <button
                        type="button"
                        disabled={busyId === "reverse"}
                        onClick={() => void reverse()}
                        title="Estornar aprovação (volta a rascunho pra editar, apaga os títulos gerados)"
                        className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--accent-maroon)] transition-colors hover:border-[var(--accent-maroon)] hover:bg-[var(--accent-maroon-soft)] disabled:opacity-50"
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
            <table ref={exportTableRef} className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-[var(--surface-hover)] text-[var(--text-secondary)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Colaborador</th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Salário base
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Extras
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Faltas
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
                  <th className="px-4 py-3 font-semibold">Confirmação</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>

              <tbody>
                {payroll?.items.map((item) => {
                  const busy = busyId === item.id;
                  const excluded = item.status === "EXCLUDED";
                  const paid = item.financialEntry?.status === "PAID";

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
                        {money(item.baseSalary)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-right text-[var(--text-secondary)]">
                        {money(item.extraAmount)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-right text-[var(--text-secondary)]">
                        {item.unjustifiedAbsenceDays > 0
                          ? `${item.unjustifiedAbsenceDays}d — ${money(item.absenceDeductionAmount)}`
                          : "—"}
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
                          {PAYROLL_ITEM_STATUS_LABELS[item.status]}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            item.confirmationStatus === "CONFIRMADO"
                              ? "bg-[var(--success-soft)] text-[var(--success)]"
                              : "bg-[var(--warning-soft)] text-[var(--warning)]"
                          }`}
                        >
                          {PAYROLL_CONFIRMATION_STATUS_LABELS[item.confirmationStatus]}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/erp/rh/folha/${payrollId}/holerite/${item.id}`}
                            target="_blank"
                            title="Ver holerite"
                            aria-label="Ver holerite"
                            className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                          >
                            <Eye size={16} />
                          </Link>

                          {item.confirmationStatus === "PENDENTE" && paid && (
                            <Can permission="payroll.confirm-item">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void sendConfirmation(item)}
                                title="Enviar link de confirmação por e-mail/WhatsApp"
                                aria-label="Enviar confirmação"
                                className="rounded-lg border border-[var(--border)] p-2 text-[var(--accent-orange)] transition-colors hover:border-[var(--accent-orange)] hover:bg-[var(--accent-orange-soft)] disabled:opacity-50"
                              >
                                <Mail size={16} />
                              </button>

                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void confirmItem(item)}
                                title="Confirmar recebimento manualmente"
                                aria-label="Confirmar recebimento"
                                className="rounded-lg border border-[var(--border)] p-2 text-[var(--success)] transition-colors hover:border-[var(--success)] hover:bg-[var(--success-soft)] disabled:opacity-50"
                              >
                                <Check size={16} />
                              </button>
                            </Can>
                          )}

                          {isDraft && (
                            <>
                              <Can permission="payroll.update">
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => void recalculateItem(item.id)}
                                  title="Recalcular a partir do ponto/faltas"
                                  aria-label="Recalcular"
                                  className="rounded-lg border border-[var(--border)] p-2 text-[var(--primary)] transition-colors hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] disabled:opacity-50"
                                >
                                  <RefreshCw size={16} />
                                </button>
                              </Can>

                              <Can permission="payroll.update">
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => openAdjust(item)}
                                  title="Ajustar proventos/descontos"
                                  aria-label="Ajustar"
                                  className="rounded-lg border border-[var(--border)] p-2 text-[var(--primary)] transition-colors hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] disabled:opacity-50"
                                >
                                  <Settings2 size={16} />
                                </button>
                              </Can>

                              <Can permission="payroll.update">
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => void toggleItem(item)}
                                  title={excluded ? "Reincluir" : "Excluir da folha"}
                                  aria-label={excluded ? "Reincluir" : "Excluir"}
                                  className={`rounded-lg border border-[var(--border)] p-2 transition-colors disabled:opacity-50 ${excluded ? "text-[var(--success)] hover:border-[var(--success)] hover:bg-[var(--success-soft)]" : "text-[var(--danger)] hover:border-[var(--danger)] hover:bg-[var(--danger-soft)]"}`}
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

              <p className="text-sm text-[var(--text-muted)]">
                Use pra lançar comissão, adiantamento ou outro valor que o
                cálculo automático não cobre. O líquido é recalculado (INSS/
                IRRF continuam incidindo sobre salário + extras + outros
                proventos, igual ao cálculo automático).
              </p>

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
