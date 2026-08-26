"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Check,
  Eye,
  FileText,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  X,
  XCircle,
} from "lucide-react";

import { AppShell } from "@/components";
import { Can } from "@/components/auth/Can";
import { ListPageLayout } from "@/components/layout/ListPageLayout";
import { SearchSelect } from "@/components/ui/SearchSelect";
import { CurrencyInput } from "@/components/ui/CurrencyInput";

import {
  DOCUMENT_TYPE_LABELS,
  FINANCIAL_ENTRY_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  financialEntryService,
  type FinancialDocumentType,
  type FinancialEntry,
  type FinancialEntryStatus,
  type FinancialEntryType,
  type PaymentMethod,
} from "@/services/financial-entry.service";

import {
  partnerService,
  type BusinessPartner,
  type PartnerRole,
} from "@/services/partner.service";

import {
  chartOfAccountService,
  type ChartOfAccount,
} from "@/services/chart-of-account.service";

function num(value: string | number | null | undefined) {
  return Number(value ?? 0);
}

function money(value: string | number | null | undefined) {
  return num(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}


function date(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
  });
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(isoDate: string, days: number) {
  const d = new Date(`${isoDate}T00:00:00Z`);

  d.setUTCDate(d.getUTCDate() + days);

  return d.toISOString().slice(0, 10);
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

const STATUS_BADGE_CLASS: Record<FinancialEntryStatus, string> = {
  OPEN: "bg-[var(--warning-soft)] text-[var(--warning)]",
  PAID: "bg-[var(--success-soft)] text-[var(--success)]",
  CANCELLED: "bg-[var(--danger-soft)] text-[var(--danger)]",
};

interface Form {
  partnerId: string;
  partnerLabel: string;
  chartOfAccountId: string;
  chartOfAccountLabel: string;
  issueDate: string;
  termDays: string;
  dueDate: string;
  documentNumber: string;
  documentType: FinancialDocumentType | "";
  amount: number;
  observation: string;
}

/** Uma parcela do título — vencimento e valor sempre editáveis à mão. */
interface InstallmentRow {
  /** Dias a partir da emissão — só ajuda a calcular o vencimento. */
  days: string;
  dueDate: string;
  amount: number;
}

function emptyForm(): Form {
  const today = todayIso();

  return {
    partnerId: "",
    partnerLabel: "",
    chartOfAccountId: "",
    chartOfAccountLabel: "",
    issueDate: today,
    termDays: "",
    dueDate: today,
    documentNumber: "",
    documentType: "",
    amount: 0,
    observation: "",
  };
}

interface Props {
  type: FinancialEntryType;
  title: string;
  partnerRole: PartnerRole;
  partnerLabel: string;
  permissionPrefix?: string;
}

export function FinancialEntriesScreen({
  type,
  title,
  partnerRole,
  partnerLabel,
}: Props) {
  const [entries, setEntries] = useState<FinancialEntry[]>([]);

  const [statusFilter, setStatusFilter] = useState("OPEN");
  const [search, setSearch] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);

  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");

  /**
   * Abre o mesmo formulário só pra consulta. Título baixado, cancelado
   * ou vindo de compra/venda não pode ser editado, mas continua
   * precisando ser aberto pra conferir o que foi lançado.
   */
  const [viewOnly, setViewOnly] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(
    null
  );
  const [form, setForm] = useState<Form>(emptyForm());
  const [installments, setInstallments] = useState<InstallmentRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [settleTarget, setSettleTarget] =
    useState<FinancialEntry | null>(null);
  const [settleForm, setSettleForm] = useState({
    paymentDate: todayIso(),
    paymentMethod: "" as PaymentMethod | "",
    paidAmount: 0,
  });
  const [settling, setSettling] = useState(false);
  const [settleError, setSettleError] = useState("");

  const [actionId, setActionId] = useState("");
  const [actionError, setActionError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setListError("");

    try {
      const result = await financialEntryService.list({
        type,
        status: (statusFilter || undefined) as
          | FinancialEntryStatus
          | undefined,
        search: search || undefined,
        overdue: overdueOnly || undefined,
      });

      setEntries(result.data ?? []);
    } catch (err) {
      setListError(
        extractMessage(
          err,
          "Não foi possível carregar os títulos."
        )
      );
    } finally {
      setLoading(false);
    }
  }, [type, statusFilter, search, overdueOnly]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 300);

    return () => clearTimeout(timer);
  }, [load]);

  const searchPartners = useCallback(
    async (query: string) => {
      const result = await partnerService.list({
        role: partnerRole,
        search: query || undefined,
        limit: 20,
      });

      return result.data;
    },
    [partnerRole]
  );

  const searchChartOfAccounts = useCallback(
    async (query: string) => {
      const result = await chartOfAccountService.list({
        search: query || undefined,
        limit: 20,
      });

      return result.data;
    },
    []
  );

  function openCreate() {
    setViewOnly(false);
    setEditingId(null);
    setForm(emptyForm());
    setInstallments([]);
    setFormError("");
    setFormOpen(true);
  }

  function openView(entry: FinancialEntry) {
    openEdit(entry);
    setViewOnly(true);
  }

  function openEdit(entry: FinancialEntry) {
    setViewOnly(false);
    setEditingId(entry.id);
    setForm({
      partnerId: entry.partnerId ?? "",
      partnerLabel:
        entry.partner?.tradeName ??
        entry.partner?.legalName ??
        "",
      chartOfAccountId: entry.chartOfAccountId ?? "",
      chartOfAccountLabel: entry.chartOfAccount
        ? `${entry.chartOfAccount.code} — ${entry.chartOfAccount.description}`
        : "",
      issueDate: entry.issueDate.slice(0, 10),
      termDays: entry.termDays ? String(entry.termDays) : "",
      dueDate: entry.dueDate.slice(0, 10),
      documentNumber: entry.documentNumber ?? "",
      documentType: entry.documentType ?? "",
      amount: num(entry.amount),
      observation: entry.observation ?? "",
    });
    setInstallments([]);
    setFormError("");
    setFormOpen(true);
  }

  function updateTermDays(value: string) {
    const days = Number(value);

    setForm((prev) => ({
      ...prev,
      termDays: value,
      dueDate:
        value && Number.isFinite(days)
          ? addDays(prev.issueDate, days)
          : prev.dueDate,
    }));
  }

  /**
   * "Parcelar" começa com a parcela única já digitada no formulário
   * (mesmo vencimento/valor), pra ninguém perder o que já preencheu —
   * a partir daí cada parcela vira um título próprio, com vencimento
   * e valor editáveis livremente.
   */
  function startInstallments() {
    setInstallments([
      { days: form.termDays, dueDate: form.dueDate, amount: form.amount },
      { days: "", dueDate: "", amount: 0 },
    ]);
  }

  function addInstallment() {
    setInstallments((prev) => [
      ...prev,
      { days: "", dueDate: "", amount: 0 },
    ]);
  }

  function removeInstallment(index: number) {
    setInstallments((prev) => {
      const next = prev.filter((_, i) => i !== index);

      // Só uma parcela sobrando não é mais "parcelado" — volta pro
      // formulário simples de vencimento único.
      return next.length <= 1 ? [] : next;
    });
  }

  function updateInstallment(
    index: number,
    patch: Partial<InstallmentRow>
  ) {
    setInstallments((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;

        const next = { ...row, ...patch };

        if (patch.days !== undefined) {
          const days = Number(patch.days);
          next.dueDate =
            patch.days && Number.isFinite(days)
              ? addDays(form.issueDate, days)
              : next.dueDate;
        }

        return next;
      })
    );
  }

  const installmentsTotal = installments.reduce(
    (sum, row) => sum + num(row.amount),
    0
  );

  const isParceled = installments.length > 1;

  async function save() {
    if (!form.partnerId || !form.issueDate || form.amount <= 0) {
      setFormError(
        `Selecione ${partnerLabel.toLowerCase()}, a emissão e um valor maior que zero.`
      );

      return;
    }

    if (!isParceled && !form.dueDate) {
      setFormError("Informe o vencimento.");
      return;
    }

    let validInstallments: { dueDate: string; amount: number }[] = [];

    if (isParceled) {
      validInstallments = installments
        .filter((row) => row.dueDate && row.amount > 0)
        .map((row) => ({ dueDate: row.dueDate, amount: row.amount }));

      if (validInstallments.length === 0) {
        setFormError(
          "Preencha o vencimento e o valor de todas as parcelas."
        );
        return;
      }

      if (Math.abs(installmentsTotal - form.amount) > 0.01) {
        setFormError(
          `A soma das parcelas (${money(installmentsTotal)}) precisa bater com o valor total (${money(form.amount)}).`
        );
        return;
      }
    }

    setSaving(true);
    setFormError("");

    try {
      const payload = {
        type,
        partnerId: form.partnerId,
        chartOfAccountId: form.chartOfAccountId || undefined,
        issueDate: form.issueDate,
        termDays: form.termDays
          ? Number(form.termDays)
          : undefined,
        dueDate: isParceled ? undefined : form.dueDate,
        documentNumber: form.documentNumber || undefined,
        documentType: form.documentType || undefined,
        amount: isParceled ? undefined : form.amount,
        installments: isParceled ? validInstallments : undefined,
        observation: form.observation || undefined,
      };

      if (editingId) {
        const { type: _type, ...updatePayload } = payload;
        await financialEntryService.update(editingId, updatePayload);
      } else {
        await financialEntryService.create(payload);
      }

      setFormOpen(false);

      await load();
    } catch (err) {
      setFormError(
        extractMessage(
          err,
          "Não foi possível salvar o título."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  function openSettle(entry: FinancialEntry) {
    setSettleTarget(entry);
    setSettleForm({
      paymentDate: todayIso(),
      paymentMethod: "",
      paidAmount: num(entry.amount) - num(entry.paidAmount),
    });
    setSettleError("");
  }

  async function confirmSettle() {
    if (!settleTarget) {
      return;
    }

    setSettling(true);
    setSettleError("");

    try {
      await financialEntryService.settle(settleTarget.id, {
        paymentDate: settleForm.paymentDate || undefined,
        paymentMethod: settleForm.paymentMethod || undefined,
        paidAmount: settleForm.paidAmount || undefined,
      });

      setSettleTarget(null);

      await load();
    } catch (err) {
      setSettleError(
        extractMessage(
          err,
          "Não foi possível registrar a baixa."
        )
      );
    } finally {
      setSettling(false);
    }
  }

  async function runAction(
    id: string,
    action: "reopen" | "cancel" | "remove"
  ) {
    setActionId(id);
    setActionError("");

    try {
      if (action === "reopen") {
        await financialEntryService.reopen(id);
      } else if (action === "cancel") {
        await financialEntryService.cancel(id);
      } else {
        await financialEntryService.remove(id);
      }

      await load();
    } catch (err) {
      setActionError(
        extractMessage(
          err,
          "Não foi possível concluir a ação."
        )
      );
    } finally {
      setActionId("");
    }
  }

  const today = todayIso();

  return (
    <AppShell workspaceLabel="Financeiro">
      <ListPageLayout
        header={
          <>
            <header className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                  {title}
                </h1>

                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  {type === "RECEIVABLE"
                    ? "Títulos a receber, lançados manualmente ou gerados por vendas aprovadas."
                    : "Títulos a pagar, lançados manualmente ou gerados por compras recebidas."}
                </p>
              </div>

              <div className="flex gap-2">
                <Link
                  href={`/erp/financeiro/contas/relatorio?type=${type}`}
                  target="_blank"
                  className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                >
                  <FileText size={18} />
                  Relatório
                </Link>

                <Can permission="financial-entry.create">
                  <button
                    type="button"
                    onClick={openCreate}
                    className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)]"
                  >
                    <Plus size={18} />
                    Novo título
                  </button>
                </Can>
              </div>
            </header>

            <div className="flex flex-wrap gap-3">
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value)
                }
                className={`${fieldClass} max-w-48`}
              >
                <option value="">Todos os status</option>

                {Object.entries(
                  FINANCIAL_ENTRY_STATUS_LABELS
                ).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>

              <input
                placeholder={`Buscar por ${partnerLabel.toLowerCase()}, documento ou observação`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`${fieldClass} min-w-64 flex-1`}
              />

              <button
                type="button"
                onClick={() => setOverdueOnly((v) => !v)}
                className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
                  overdueOnly
                    ? "border-[var(--danger)] bg-[var(--danger-soft)] text-[var(--danger)]"
                    : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                }`}
              >
                <AlertTriangle size={16} />
                Vencidos
              </button>
            </div>

            {listError && (
              <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                {listError}
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
        ) : entries.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-medium text-[var(--text-primary)]">
              Nenhum título encontrado
            </p>

            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Use &quot;Novo título&quot; para lançar um.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-[var(--surface-hover)] text-[var(--text-secondary)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">
                    Vencimento
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    {partnerLabel}
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Documento
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Valor
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Status
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>

              <tbody>
                {entries.map((entry) => {
                  const busy = actionId === entry.id;

                  const overdue =
                    entry.status === "OPEN" &&
                    entry.dueDate.slice(0, 10) < today;

                  return (
                    <tr
                      key={entry.id}
                      className="border-t border-[var(--border)]"
                    >
                      <td className="whitespace-nowrap px-4 py-3">
                        <span
                          className={
                            overdue
                              ? "inline-flex items-center gap-1.5 font-semibold text-[var(--danger)]"
                              : "text-[var(--text-secondary)]"
                          }
                        >
                          {overdue && (
                            <AlertTriangle size={14} />
                          )}
                          {date(entry.dueDate)}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <p className="font-medium text-[var(--text-primary)]">
                          {entry.partner?.tradeName ??
                            entry.partner?.legalName ??
                            entry.employee?.name ??
                            "—"}
                        </p>
                      </td>

                      <td className="px-4 py-3 text-[var(--text-secondary)]">
                        {entry.documentNumber ?? "—"}
                        {entry.documentType && (
                          <span className="ml-1 text-xs text-[var(--text-muted)]">
                            (
                            {
                              DOCUMENT_TYPE_LABELS[
                                entry.documentType
                              ]
                            }
                            )
                          </span>
                        )}
                        {entry.documentKey && (
                          <p
                            className="text-xs text-[var(--text-muted)]"
                            title={entry.documentKey}
                          >
                            Chave: {entry.documentKey}
                          </p>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-[var(--text-primary)]">
                        {money(entry.amount)}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE_CLASS[entry.status]}`}
                        >
                          {
                            FINANCIAL_ENTRY_STATUS_LABELS[
                              entry.status
                            ]
                          }
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {/* Sempre disponível: consultar não altera nada,
                              e é a única forma de rever um título já
                              baixado ou cancelado. */}
                          <button
                            type="button"
                            onClick={() => openView(entry)}
                            title="Consultar"
                            aria-label="Consultar"
                            className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)]"
                          >
                            <Eye size={16} />
                          </button>

                          {entry.status === "OPEN" && (
                            <>
                              {!entry.employeeId && (
                                <Can permission="financial-entry.update">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openEdit(entry)
                                    }
                                    title="Editar"
                                    aria-label="Editar"
                                    className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)]"
                                  >
                                    <Pencil size={16} />
                                  </button>
                                </Can>
                              )}

                              <Can permission="financial-entry.settle">
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() =>
                                    openSettle(entry)
                                  }
                                  title="Baixar"
                                  aria-label="Baixar"
                                  className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--success)] hover:text-[var(--success)] disabled:opacity-50"
                                >
                                  <Check size={16} />
                                </button>
                              </Can>

                              <Can permission="financial-entry.cancel">
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() =>
                                    void runAction(
                                      entry.id,
                                      "cancel"
                                    )
                                  }
                                  title="Cancelar"
                                  aria-label="Cancelar"
                                  className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--danger)] hover:text-[var(--danger)] disabled:opacity-50"
                                >
                                  <XCircle size={16} />
                                </button>
                              </Can>

                              {!entry.purchaseId &&
                                !entry.saleId &&
                                !entry.employeeId && (
                                  <Can permission="financial-entry.delete">
                                    <button
                                      type="button"
                                      disabled={busy}
                                      onClick={() =>
                                        void runAction(
                                          entry.id,
                                          "remove"
                                        )
                                      }
                                      title="Excluir"
                                      aria-label="Excluir"
                                      className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--danger)] hover:text-[var(--danger)] disabled:opacity-50"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </Can>
                                )}
                            </>
                          )}

                          {entry.status === "PAID" && (
                            <Can permission="financial-entry.settle">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => {
                                  if (
                                    !window.confirm(
                                      "Tem certeza que deseja estornar?"
                                    )
                                  ) {
                                    return;
                                  }

                                  void runAction(
                                    entry.id,
                                    "reopen"
                                  );
                                }}
                                title="Estornar baixa"
                                aria-label="Estornar baixa"
                                className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--warning)] hover:text-[var(--warning)] disabled:opacity-50"
                              >
                                <RotateCcw size={16} />
                              </button>
                            </Can>
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

      {/* Novo título / Editar título */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-8 w-full max-w-xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                {viewOnly
                  ? "Título"
                  : editingId
                    ? "Editar título"
                    : "Novo título"}
              </h2>

              <button
                type="button"
                onClick={() => setFormOpen(false)}
                aria-label="Fechar"
                className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)]"
              >
                <X size={18} />
              </button>
            </div>

            {/* `fieldset disabled` trava todos os campos de uma vez, sem
                ter que repetir a condição em cada input; o
                pointer-events cobre os componentes de busca, que não
                são campos nativos. */}
            <fieldset
              disabled={viewOnly}
              className={`space-y-4 ${viewOnly ? "pointer-events-none" : ""}`}
            >
              <div>
                <label className={labelClass}>
                  {partnerLabel}
                </label>

                <SearchSelect<BusinessPartner>
                  displayLabel={form.partnerLabel}
                  search={searchPartners}
                  getId={(p) => p.id}
                  getLabel={(p) =>
                    p.tradeName ?? p.legalName
                  }
                  getSubLabel={(p) => p.document}
                  placeholder={`Digite para buscar ${partnerLabel.toLowerCase()}...`}
                  onSelect={(p) =>
                    setForm({
                      ...form,
                      partnerId: p?.id ?? "",
                      partnerLabel: p
                        ? (p.tradeName ?? p.legalName)
                        : "",
                    })
                  }
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className={labelClass}>
                    Data de emissão
                  </label>

                  <input
                    type="date"
                    className={fieldClass}
                    value={form.issueDate}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        issueDate: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Prazo (dias)
                  </label>

                  <input
                    inputMode="numeric"
                    placeholder="Ex.: 30"
                    className={fieldClass}
                    value={form.termDays}
                    onChange={(e) =>
                      updateTermDays(e.target.value)
                    }
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Vencimento
                  </label>

                  <input
                    type="date"
                    disabled={isParceled}
                    className={`${fieldClass} ${
                      isParceled
                        ? "opacity-60"
                        : ""
                    }`}
                    value={form.dueDate}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        dueDate: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              {!editingId && (
                <div>
                  {!isParceled ? (
                    <button
                      type="button"
                      onClick={startInstallments}
                      className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                    >
                      <Plus size={14} />
                      Parcelar
                    </button>
                  ) : (
                    <div className="space-y-2 rounded-xl border border-[var(--border)] p-4">
                      <div className="flex items-center justify-between">
                        <label className={labelClass}>
                          Parcelas
                        </label>

                        <button
                          type="button"
                          onClick={addInstallment}
                          className="flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                        >
                          <Plus size={14} />
                          Adicionar parcela
                        </button>
                      </div>

                      {installments.map((row, index) => (
                        <div
                          key={index}
                          className="grid grid-cols-12 items-center gap-2"
                        >
                          <input
                            inputMode="numeric"
                            placeholder="Dias"
                            title="Dias a partir da emissão"
                            className={`${fieldClass} col-span-2`}
                            value={row.days}
                            onChange={(e) =>
                              updateInstallment(index, {
                                days: e.target.value,
                              })
                            }
                          />

                          <input
                            type="date"
                            className={`${fieldClass} col-span-4`}
                            value={row.dueDate}
                            onChange={(e) =>
                              updateInstallment(index, {
                                dueDate: e.target.value,
                                days: "",
                              })
                            }
                          />

                          <div className="col-span-5">
                            <CurrencyInput
                              className={fieldClass}
                              value={row.amount}
                              onChange={(value) =>
                                updateInstallment(index, {
                                  amount: value,
                                })
                              }
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => removeInstallment(index)}
                            className="col-span-1 flex items-center justify-center rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}

                      <p
                        className={`text-xs ${
                          Math.abs(installmentsTotal - form.amount) > 0.01
                            ? "text-[var(--danger)]"
                            : "text-[var(--text-muted)]"
                        }`}
                      >
                        Soma das parcelas: {money(installmentsTotal)} de{" "}
                        {money(form.amount)}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>
                    Documento
                  </label>

                  <input
                    placeholder="Número da nota/boleto"
                    className={fieldClass}
                    value={form.documentNumber}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        documentNumber: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Tipo de documento
                  </label>

                  <select
                    className={fieldClass}
                    value={form.documentType}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        documentType: e.target
                          .value as FinancialDocumentType,
                      })
                    }
                  >
                    <option value="">Não informado</option>

                    {Object.entries(
                      DOCUMENT_TYPE_LABELS
                    ).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>
                    Valor (R$)
                  </label>

                  <CurrencyInput
                    className={fieldClass}
                    value={form.amount}
                    onChange={(value) =>
                      setForm({
                        ...form,
                        amount: value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Classificação (opcional)
                  </label>

                  <SearchSelect<ChartOfAccount>
                    displayLabel={
                      form.chartOfAccountLabel
                    }
                    search={searchChartOfAccounts}
                    getId={(c) => c.id}
                    getLabel={(c) =>
                      `${c.code} — ${c.description}`
                    }
                    getSubLabel={(c) =>
                      c.classification?.name
                    }
                    placeholder="Buscar conta do plano de contas..."
                    onSelect={(c) =>
                      setForm({
                        ...form,
                        chartOfAccountId: c?.id ?? "",
                        chartOfAccountLabel: c
                          ? `${c.code} — ${c.description}`
                          : "",
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>
                  Observação
                </label>

                <input
                  className={fieldClass}
                  value={form.observation}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      observation: e.target.value,
                    })
                  }
                />
              </div>

              {formError && (
                <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                  {formError}
                </div>
              )}

            </fieldset>

            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="rounded-xl border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--text-secondary)]"
              >
                {viewOnly ? "Fechar" : "Cancelar"}
              </button>

              {!viewOnly && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void save()}
                  className="rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] disabled:opacity-60"
                >
                  {saving ? "Salvando..." : "Salvar"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Baixar título */}
      {settleTarget && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-8 w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                  {type === "RECEIVABLE"
                    ? "Registrar recebimento"
                    : "Registrar pagamento"}
                </h2>

                <p className="text-sm text-[var(--text-muted)]">
                  {settleTarget.partner?.tradeName ??
                    settleTarget.partner?.legalName ??
                    settleTarget.employee?.name}{" "}
                  · {money(settleTarget.amount)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSettleTarget(null)}
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
                    Data
                  </label>

                  <input
                    type="date"
                    className={fieldClass}
                    value={settleForm.paymentDate}
                    onChange={(e) =>
                      setSettleForm({
                        ...settleForm,
                        paymentDate: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Valor (R$)
                  </label>

                  <CurrencyInput
                    className={fieldClass}
                    value={settleForm.paidAmount}
                    onChange={(value) =>
                      setSettleForm({
                        ...settleForm,
                        paidAmount: value,
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>
                  Forma de pagamento
                </label>

                <select
                  className={fieldClass}
                  value={settleForm.paymentMethod}
                  onChange={(e) =>
                    setSettleForm({
                      ...settleForm,
                      paymentMethod: e.target
                        .value as PaymentMethod,
                    })
                  }
                >
                  <option value="">Não informado</option>

                  {Object.entries(
                    PAYMENT_METHOD_LABELS
                  ).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {settleError && (
                <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                  {settleError}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSettleTarget(null)}
                  className="rounded-xl border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--text-secondary)]"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={settling}
                  onClick={() => void confirmSettle()}
                  className="rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] disabled:opacity-60"
                >
                  {settling ? "Salvando..." : "Confirmar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
