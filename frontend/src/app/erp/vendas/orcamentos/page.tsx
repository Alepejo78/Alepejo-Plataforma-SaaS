"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Edit,
  Eye,
  FileText,
  Plus,
  Send,
  Trash2,
  Undo2,
  X,
  XCircle,
} from "lucide-react";

import { AppShell } from "@/components";
import { Can } from "@/components/auth/Can";
import { ListPageLayout } from "@/components/layout/ListPageLayout";
import { ExportButton } from "@/components/ui/ExportButton";
import { SearchSelect } from "@/components/ui/SearchSelect";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import {
  InstallmentsEditor,
  buildInstallmentRows,
  daysBetween,
  recalcDueDateFromDays,
  toDateInput,
  type InstallmentRow,
} from "@/components/ui/InstallmentsEditor";
import {
  chartOfAccountService,
  type ChartOfAccount,
} from "@/services/chart-of-account.service";

import {
  QUOTE_STATUS_LABELS,
  quoteService,
  type Quote,
  type QuoteStatus,
} from "@/services/quote.service";

import {
  partnerService,
  type BusinessPartner,
} from "@/services/partner.service";

import {
  warehouseService,
  type Warehouse,
} from "@/services/inventory.service";

import {
  productService,
  type Product,
} from "@/services/product.service";

import {
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
} from "@/services/financial-entry.service";

function num(value: string | number | null | undefined) {
  return Number(value ?? 0);
}

function money(value: string | number | null | undefined) {
  return num(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function date(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
  });
}

function formatNumber(n: number) {
  return `ORC-${String(n).padStart(6, "0")}`;
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

const STATUS_BADGE_CLASS: Record<QuoteStatus, string> = {
  DRAFT: "bg-[var(--surface-hover)] text-[var(--text-secondary)]",
  SENT: "bg-[var(--warning-soft)] text-[var(--warning)]",
  REVISION_REQUESTED: "bg-[var(--warning-soft)] text-[var(--warning)]",
  APPROVED: "bg-[var(--primary-soft)] text-[var(--primary)]",
  CONVERTED: "bg-[var(--success-soft)] text-[var(--success)]",
  CANCELLED: "bg-[var(--danger-soft)] text-[var(--danger)]",
};

function formatOrderNumber(n: number) {
  return `PV-${String(n).padStart(6, "0")}`;
}

interface ItemForm {
  productId: string;
  productLabel: string;
  quantity: string;
  unitPrice: number;
}

function emptyItem(): ItemForm {
  return {
    productId: "",
    productLabel: "",
    quantity: "",
    unitPrice: 0,
  };
}

function emptyForm() {
  return {
    partnerId: "",
    partnerLabel: "",
    warehouseId: "",
    quoteDate: todayIso(),
    validUntil: "",
    observation: "",
    discountValue: 0,
    freightValue: 0,
    otherExpenses: 0,
    termDays: "",
    paymentMethod: "" as PaymentMethod | "",
    installmentsCount: "",
    chartOfAccountId: "",
    chartOfAccountLabel: "",
  };
}

export default function OrcamentosPage() {
  const exportTableRef = useRef<HTMLTableElement>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  const [statusFilter, setStatusFilter] = useState("");

  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [viewOnly, setViewOnly] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(
    null
  );
  const [form, setForm] = useState(emptyForm());
  const [items, setItems] = useState<ItemForm[]>([
    emptyItem(),
  ]);
  // Parcelas planejadas — editável linha a linha (dias, vencimento e
  // valor), repassadas pro Pedido de Venda e pra Venda gerados na
  // aprovação (mesmo esquema de Compras).
  const [installments, setInstallments] = useState<InstallmentRow[]>([
    { days: "", dueDate: "", amount: 0 },
  ]);

  const [detail, setDetail] = useState<Quote | null>(null);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [actionId, setActionId] = useState("");
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    warehouseService
      .list()
      .then(setWarehouses)
      .catch(() => {
        setListError(
          "Não foi possível carregar os depósitos."
        );
      });
  }, []);

  const searchCustomers = useCallback(
    async (query: string) => {
      const result = await partnerService.list({
        role: "CUSTOMER",
        search: query || undefined,
        limit: 20,
      });

      return result.data;
    },
    []
  );

  const searchProducts = useCallback(
    async (query: string) => {
      const result = await productService.list({
        search: query || undefined,
        limit: 20,
      });

      return result.data;
    },
    []
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

  const load = useCallback(async () => {
    setLoading(true);
    setListError("");

    try {
      const result = await quoteService.list({
        status: (statusFilter || undefined) as
          | QuoteStatus
          | undefined,
      });

      setQuotes(result);
    } catch (err) {
      setListError(
        extractMessage(
          err,
          "Não foi possível carregar os orçamentos."
        )
      );
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditingId(null);
    setViewOnly(false);
    setDetail(null);
    setForm({
      ...emptyForm(),
      warehouseId: warehouses[0]?.id ?? "",
    });
    setItems([emptyItem()]);
    setInstallments([{ days: "", dueDate: "", amount: 0 }]);
    setFormError("");
    setFormOpen(true);
  }

  function populateQuoteForm(quote: Quote) {
    setForm({
      partnerId: quote.partnerId,
      partnerLabel:
        quote.partner?.tradeName ??
        quote.partner?.legalName ??
        "",
      warehouseId: quote.warehouseId,
      quoteDate: quote.quoteDate
        ? quote.quoteDate.slice(0, 10)
        : "",
      validUntil: quote.validUntil
        ? quote.validUntil.slice(0, 10)
        : "",
      observation: quote.observation ?? "",
      discountValue: num(quote.discountValue),
      freightValue: num(quote.freightValue),
      otherExpenses: num(quote.otherExpenses),
      termDays: quote.termDays ? String(quote.termDays) : "",
      paymentMethod: quote.paymentMethod ?? "",
      installmentsCount:
        quote.installmentsCount != null &&
        quote.installmentsCount > 1
          ? String(quote.installmentsCount)
          : "",
      chartOfAccountId: quote.chartOfAccountId ?? "",
      chartOfAccountLabel: quote.chartOfAccount
        ? `${quote.chartOfAccount.code} — ${quote.chartOfAccount.description}`
        : "",
    });
    setItems(
      quote.items.map((it) => ({
        productId: it.productId,
        productLabel: it.product
          ? `${it.product.code} — ${it.product.description}`
          : "",
        quantity: String(num(it.quantity)),
        unitPrice: num(it.unitPrice),
      }))
    );

    const quoteDateStr = quote.quoteDate
      ? quote.quoteDate.slice(0, 10)
      : todayIso();
    // Base das parcelas é o líquido (o que o cliente paga de fato),
    // não a soma bruta dos itens.
    const quoteNetTotal = num(quote.netAmount);

    if (quote.plannedInstallments?.length) {
      setInstallments(
        quote.plannedInstallments.map((row) => ({
          days: daysBetween(quoteDateStr, toDateInput(row.dueDate)),
          dueDate: toDateInput(row.dueDate),
          amount: row.amount,
        }))
      );
    } else {
      const count =
        quote.installmentsCount && quote.installmentsCount > 1
          ? quote.installmentsCount
          : 1;

      setInstallments(
        buildInstallmentRows(
          quoteDateStr,
          quote.termDays ?? 0,
          count,
          quoteNetTotal
        )
      );
    }
  }

  function openEdit(quote: Quote) {
    setEditingId(quote.id);
    setViewOnly(false);
    setDetail(quote);
    populateQuoteForm(quote);
    setFormError("");
    setFormOpen(true);
  }

  function openView(quote: Quote) {
    setEditingId(quote.id);
    setViewOnly(true);
    setDetail(quote);
    populateQuoteForm(quote);
    setFormError("");
    setFormOpen(true);
  }

  const decimal = (value: string) => {
    const normalized = value
      .replace(/\./g, "")
      .replace(",", ".");

    const parsed = Number(normalized);

    return Number.isFinite(parsed) ? parsed : 0;
  };

  function updateItem(
    index: number,
    patch: Partial<ItemForm>
  ) {
    setItems((prev) =>
      prev.map((it, i) =>
        i === index ? { ...it, ...patch } : it
      )
    );
  }

  function addItem() {
    setItems((prev) => [...prev, emptyItem()]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateInstallment(
    index: number,
    patch: Partial<InstallmentRow>
  ) {
    setInstallments((prev) =>
      prev.map((row, i) => {
        if (i !== index) {
          return row;
        }

        const next = { ...row, ...patch };

        // Dias preenchido recalcula o vencimento a partir da data
        // do orçamento — deixar em branco não mexe: a pessoa digita
        // a data direto.
        if (patch.days !== undefined && patch.days !== "") {
          next.dueDate = recalcDueDateFromDays(
            form.quoteDate || undefined,
            patch.days
          );
        }

        return next;
      })
    );
  }

  function addInstallment() {
    setInstallments((prev) => [
      ...prev,
      { days: "", dueDate: "", amount: 0 },
    ]);
  }

  function removeInstallment(index: number) {
    setInstallments((prev) => prev.filter((_, i) => i !== index));
  }

  const itemsTotal = items.reduce(
    (sum, it) => sum + decimal(it.quantity) * it.unitPrice,
    0
  );

  const netTotal =
    itemsTotal -
    form.discountValue +
    form.freightValue +
    form.otherExpenses;

  async function saveForm() {
    if (!form.partnerId || !form.warehouseId) {
      setFormError("Selecione o cliente e o depósito.");

      return;
    }

    const validItems = items.filter(
      (it) => it.productId && decimal(it.quantity) > 0
    );

    if (validItems.length === 0) {
      setFormError(
        "Adicione ao menos um item com produto e quantidade."
      );

      return;
    }

    if (!form.chartOfAccountId) {
      setFormError("Selecione o tipo de receita.");

      return;
    }

    if (!form.paymentMethod) {
      setFormError("Selecione a forma de pagamento.");

      return;
    }

    if (form.termDays === "") {
      setFormError("Informe o prazo/vencimento.");

      return;
    }

    const validItemsTotal = validItems.reduce(
      (sum, it) => sum + decimal(it.quantity) * it.unitPrice,
      0
    );
    // As parcelas dividem o líquido (o que o cliente paga de fato) —
    // desconto/frete/outras despesas já entram na conta.
    const validNetTotal =
      validItemsTotal -
      form.discountValue +
      form.freightValue +
      form.otherExpenses;
    const singleInstallment = installments.length === 1;

    const finalInstallments = singleInstallment
      ? [{ dueDate: installments[0].dueDate, amount: validNetTotal }]
      : installments.map((row) => ({
          dueDate: row.dueDate,
          amount: row.amount,
        }));

    if (finalInstallments.some((row) => !row.dueDate)) {
      setFormError("Preencha o vencimento de todas as parcelas.");

      return;
    }

    if (!singleInstallment) {
      const sum = finalInstallments.reduce(
        (acc, row) => acc + row.amount,
        0
      );

      if (Math.abs(sum - validNetTotal) > 0.01) {
        setFormError(
          `A soma das parcelas (${money(sum)}) precisa bater com o valor líquido (${money(validNetTotal)}).`
        );

        return;
      }
    }

    setSaving(true);
    setFormError("");

    const payload = {
      partnerId: form.partnerId,
      warehouseId: form.warehouseId,
      quoteDate: form.quoteDate || undefined,
      validUntil: form.validUntil || undefined,
      observation: form.observation || undefined,
      discountValue: form.discountValue || undefined,
      freightValue: form.freightValue || undefined,
      otherExpenses: form.otherExpenses || undefined,
      termDays: Number(form.termDays),
      paymentMethod: form.paymentMethod as PaymentMethod,
      installmentsCount: form.installmentsCount
        ? Number(form.installmentsCount)
        : undefined,
      installments: finalInstallments,
      chartOfAccountId: form.chartOfAccountId,
      items: validItems.map((it) => ({
        productId: it.productId,
        quantity: decimal(it.quantity),
        unitPrice: it.unitPrice,
      })),
    };

    try {
      if (editingId) {
        await quoteService.update(editingId, payload);
      } else {
        await quoteService.create(payload);
      }

      setFormOpen(false);

      await load();
    } catch (err) {
      setFormError(
        extractMessage(
          err,
          "Não foi possível salvar o orçamento."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  async function cancelQuote(id: string) {
    setActionId(id);
    setActionError("");

    try {
      await quoteService.cancel(id);

      await load();
    } catch (err) {
      setActionError(
        extractMessage(
          err,
          "Não foi possível cancelar o orçamento."
        )
      );
    } finally {
      setActionId("");
    }
  }

  async function removeQuote(id: string) {
    if (!window.confirm("Excluir este orçamento? Não pode ser desfeito.")) {
      return;
    }

    setActionId(id);
    setActionError("");

    try {
      await quoteService.remove(id);

      await load();
    } catch (err) {
      setActionError(
        extractMessage(err, "Não foi possível excluir o orçamento.")
      );
    } finally {
      setActionId("");
    }
  }

  async function sendConfirmation(id: string) {
    setActionId(id);
    setActionError("");

    try {
      await quoteService.sendConfirmation(id);

      await load();
    } catch (err) {
      setActionError(
        extractMessage(
          err,
          "Não foi possível enviar o link de aprovação ao cliente."
        )
      );
    } finally {
      setActionId("");
    }
  }

  async function approveQuote(id: string) {
    setActionId(id);
    setActionError("");

    try {
      await quoteService.approve(id);

      await load();
    } catch (err) {
      setActionError(
        extractMessage(
          err,
          "Não foi possível aprovar o orçamento."
        )
      );
    } finally {
      setActionId("");
    }
  }

  async function undoApproval(id: string) {
    if (
      !window.confirm(
        "Estornar a aprovação deste orçamento? O pedido de venda gerado será excluído."
      )
    ) {
      return;
    }

    setActionId(id);
    setActionError("");

    try {
      await quoteService.undoApproval(id);

      await load();
    } catch (err) {
      setActionError(
        extractMessage(
          err,
          "Não foi possível estornar o orçamento."
        )
      );
    } finally {
      setActionId("");
    }
  }

  const semDeposito = warehouses.length === 0;

  return (
    <AppShell workspaceLabel="Orçamentos">
      <ListPageLayout
        header={
          <>
            <header>
              <Link
                href="/erp/vendas"
                className="mb-3 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              >
                <ArrowLeft size={16} />
                Voltar para Vendas
              </Link>

              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                    Orçamentos
                  </h1>

                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    Propostas enviadas ao cliente. Ao virar
                    venda, ficam bloqueados para edição.
                  </p>
                </div>

                <div className="flex gap-2">
                  <ExportButton
                    tableRef={exportTableRef}
                    filename="orcamentos"
                    sheetName="Orçamentos"
                  />

                  <Link
                    href="/erp/vendas/orcamentos/relatorio"
                    target="_blank"
                    className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                  >
                    <FileText size={18} />
                    Relatório
                  </Link>

                  <Can permission="quote.create">
                    <button
                      type="button"
                      onClick={openCreate}
                      disabled={semDeposito}
                      title={
                        semDeposito
                          ? "Cadastre um depósito primeiro"
                          : undefined
                      }
                      className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-50"
                    >
                      <Plus size={18} />
                      Novo orçamento
                    </button>
                  </Can>
                </div>
              </div>
            </header>

            <div className="flex flex-wrap gap-3">
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value)
                }
                className={`${fieldClass} max-w-64`}
              >
                <option value="">Todos os status</option>

                {Object.entries(QUOTE_STATUS_LABELS).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  )
                )}
              </select>
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
        ) : quotes.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-medium text-[var(--text-primary)]">
              Nenhum orçamento cadastrado
            </p>

            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Use &quot;Novo orçamento&quot; para começar.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table ref={exportTableRef} className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-[var(--surface-hover)] text-[var(--text-secondary)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">
                    Número
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Data
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Cliente
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Validade
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Líquido
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Status
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>

              <tbody>
                {quotes.map((q) => {
                  const busy = actionId === q.id;

                  return (
                    <tr
                      key={q.id}
                      className="border-t border-[var(--border)]"
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-[var(--text-primary)]">
                        {formatNumber(q.number)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-[var(--text-secondary)]">
                        {date(q.quoteDate ?? q.createdAt)}
                      </td>

                      <td className="px-4 py-3">
                        <p className="font-medium text-[var(--text-primary)]">
                          {q.partner?.tradeName ??
                            q.partner?.legalName ??
                            "—"}
                        </p>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-[var(--text-secondary)]">
                        {date(q.validUntil)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-[var(--text-primary)]">
                        {money(q.netAmount)}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE_CLASS[q.status]}`}
                        >
                          {QUOTE_STATUS_LABELS[q.status]}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openView(q)}
                            title="Consultar"
                            aria-label="Consultar"
                            className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                          >
                            <Eye size={16} />
                          </button>

                          {q.status === "APPROVED" && (
                            <Can permission="quote.approve">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() =>
                                  void undoApproval(q.id)
                                }
                                title="Estornar aprovação (exclui o pedido de venda gerado)"
                                aria-label="Estornar"
                                className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--danger)] hover:text-[var(--danger)] disabled:opacity-50"
                              >
                                <Undo2 size={16} />
                              </button>
                            </Can>
                          )}

                          {(q.status === "DRAFT" ||
                            q.status === "REVISION_REQUESTED") && (
                            <>
                              <Can permission="quote.update">
                                <button
                                  type="button"
                                  onClick={() =>
                                    openEdit(q)
                                  }
                                  title="Editar"
                                  aria-label="Editar"
                                  className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]"
                                >
                                  <Edit size={16} />
                                </button>
                              </Can>

                              <Can permission="quote.send-confirmation">
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() =>
                                    void sendConfirmation(q.id)
                                  }
                                  title={
                                    q.status === "REVISION_REQUESTED"
                                      ? "Reenviar link de aprovação ao cliente"
                                      : "Enviar link de aprovação ao cliente"
                                  }
                                  aria-label="Enviar para aprovação do cliente"
                                  className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:opacity-50"
                                >
                                  <Send size={16} />
                                </button>
                              </Can>

                              <Can permission="quote.approve">
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() =>
                                    void approveQuote(q.id)
                                  }
                                  title="Aprovar manualmente (ex.: cliente confirmou por telefone) — gera Pedido de Venda"
                                  aria-label="Aprovar manualmente"
                                  className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:opacity-50"
                                >
                                  <Check size={16} />
                                </button>
                              </Can>

                              <Can permission="quote.cancel">
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() =>
                                    void cancelQuote(q.id)
                                  }
                                  title="Cancelar"
                                  aria-label="Cancelar"
                                  className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--danger)] hover:text-[var(--danger)] disabled:opacity-50"
                                >
                                  <XCircle size={16} />
                                </button>
                              </Can>
                            </>
                          )}

                          {q.status === "SENT" && (
                            <>
                              <Can permission="quote.approve">
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() =>
                                    void approveQuote(q.id)
                                  }
                                  title="Aprovar manualmente (ex.: cliente confirmou por telefone) — gera Pedido de Venda"
                                  aria-label="Aprovar manualmente"
                                  className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:opacity-50"
                                >
                                  <Check size={16} />
                                </button>
                              </Can>

                              <Can permission="quote.cancel">
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() =>
                                    void cancelQuote(q.id)
                                  }
                                  title="Cancelar"
                                  aria-label="Cancelar"
                                  className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--danger)] hover:text-[var(--danger)] disabled:opacity-50"
                                >
                                  <XCircle size={16} />
                                </button>
                              </Can>
                            </>
                          )}

                          {q.status === "CONVERTED" &&
                            !q.salesOrder && (
                              <Can permission="quote.cancel">
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() =>
                                    void cancelQuote(q.id)
                                  }
                                  title="Cancelar (o pedido/venda gerado foi excluído por fora)"
                                  aria-label="Cancelar"
                                  className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--danger)] hover:text-[var(--danger)] disabled:opacity-50"
                                >
                                  <XCircle size={16} />
                                </button>
                              </Can>
                            )}

                          {q.status === "CANCELLED" && (
                            <Can permission="quote.delete">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void removeQuote(q.id)}
                                title="Excluir"
                                aria-label="Excluir"
                                className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--danger)] hover:text-[var(--danger)] disabled:opacity-50"
                              >
                                <Trash2 size={16} />
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

      {/* Novo/editar/consultar orçamento */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-8 w-full max-w-5xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                  {viewOnly
                    ? "Consultar orçamento"
                    : editingId
                      ? "Editar orçamento"
                      : "Novo orçamento"}
                </h2>

                {viewOnly && detail && (
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    {QUOTE_STATUS_LABELS[detail.status]}
                    {detail.salesOrder &&
                      ` · Pedido de venda gerado: ${formatOrderNumber(detail.salesOrder.number)}`}
                  </p>
                )}

                {viewOnly &&
                  detail?.status === "REVISION_REQUESTED" &&
                  detail.customerRevisionNote && (
                    <p className="mt-2 rounded-lg border border-[var(--warning)] bg-[var(--warning-soft)] p-2 text-sm text-[var(--warning)]">
                      Cliente pediu revisão: &quot;
                      {detail.customerRevisionNote}&quot;
                    </p>
                  )}

                {viewOnly &&
                  detail?.status === "CANCELLED" &&
                  detail.customerCancelReason && (
                    <p className="mt-2 rounded-lg border border-[var(--danger)] bg-[var(--danger-soft)] p-2 text-sm text-[var(--danger)]">
                      Cliente cancelou: &quot;{detail.customerCancelReason}
                      &quot;
                    </p>
                  )}

                {viewOnly &&
                  detail &&
                  (detail.createdByName ||
                    detail.updatedByName) && (
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      {[
                        detail.createdByName &&
                          `Criado por ${detail.createdByName} em ${date(detail.createdAt)}`,
                        detail.updatedByName &&
                          detail.updatedByName !==
                            detail.createdByName &&
                          `Última alteração por ${detail.updatedByName}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
              </div>

              <button
                type="button"
                onClick={() => setFormOpen(false)}
                aria-label="Fechar"
                className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)]"
              >
                <X size={18} />
              </button>
            </div>

            <fieldset disabled={viewOnly} className="contents">
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <div className="sm:col-span-2 lg:col-span-1">
                  <label className={labelClass}>
                    Cliente
                  </label>

                  <SearchSelect<BusinessPartner>
                    displayLabel={form.partnerLabel}
                    search={searchCustomers}
                    getId={(p) => p.id}
                    getLabel={(p) =>
                      p.tradeName ?? p.legalName
                    }
                    getSubLabel={(p) => p.document}
                    placeholder="Digite para buscar o cliente..."
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

                <div>
                  <label className={labelClass}>
                    Depósito
                  </label>

                  <select
                    className={fieldClass}
                    value={form.warehouseId}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        warehouseId: e.target.value,
                      })
                    }
                  >
                    <option value="">Selecione...</option>

                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.code} — {w.description}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>
                    Data do orçamento
                  </label>

                  <input
                    type="date"
                    className={fieldClass}
                    value={form.quoteDate}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        quoteDate: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Válido até
                  </label>

                  <input
                    type="date"
                    className={fieldClass}
                    value={form.validUntil}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        validUntil: e.target.value,
                      })
                    }
                  />
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
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className={labelClass}>Itens</label>

                  <button
                    type="button"
                    onClick={addItem}
                    className="flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                  >
                    <Plus size={14} />
                    Adicionar item
                  </button>
                </div>

                <div className="space-y-2">
                  {items.map((it, index) => {
                    const subtotal =
                      decimal(it.quantity) * it.unitPrice;

                    return (
                      <div
                        key={index}
                        className="grid grid-cols-12 items-start gap-2 rounded-xl border border-[var(--border)] p-2"
                      >
                        <div className="col-span-5">
                          <SearchSelect<Product>
                            displayLabel={it.productLabel}
                            search={searchProducts}
                            getId={(p) => p.id}
                            getLabel={(p) =>
                              `${p.code} — ${p.description}`
                            }
                            getSubLabel={(p) =>
                              money(p.salePrice)
                            }
                            placeholder="Digite para buscar o produto..."
                            onSelect={(p) => {
                              updateItem(index, {
                                productId: p?.id ?? "",
                                productLabel: p
                                  ? `${p.code} — ${p.description}`
                                  : "",
                                unitPrice:
                                  p && !it.unitPrice
                                    ? num(p.salePrice)
                                    : it.unitPrice,
                              });

                              // Sugere o tipo de receita a partir do
                              // produto — só quando o orçamento ainda
                              // não tem um escolhido (não sobrescreve).
                              if (
                                p?.saleChartOfAccountId &&
                                !form.chartOfAccountId
                              ) {
                                setForm((prev) => ({
                                  ...prev,
                                  chartOfAccountId:
                                    p.saleChartOfAccountId!,
                                  chartOfAccountLabel: p.saleChartOfAccount
                                    ? `${p.saleChartOfAccount.code} — ${p.saleChartOfAccount.description}`
                                    : prev.chartOfAccountLabel,
                                }));
                              }
                            }}
                          />
                        </div>

                        <input
                          inputMode="decimal"
                          placeholder="Qtd"
                          className={`${fieldClass} col-span-2`}
                          value={it.quantity}
                          onChange={(e) =>
                            updateItem(index, {
                              quantity: e.target.value,
                            })
                          }
                        />

                        <CurrencyInput
                          placeholder="Preço unit."
                          wrapperClassName="col-span-2"
                          className={fieldClass}
                          value={it.unitPrice}
                          onChange={(value) =>
                            updateItem(index, {
                              unitPrice: value,
                            })
                          }
                        />

                        <div className="col-span-2 whitespace-nowrap py-2.5 text-right text-sm font-medium text-[var(--text-primary)]">
                          {money(subtotal)}
                        </div>

                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          disabled={items.length === 1}
                          title="Remover item"
                          aria-label="Remover item"
                          className="col-span-1 flex justify-center py-2 text-[var(--text-secondary)] transition-colors hover:text-[var(--danger)] disabled:opacity-30"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className={labelClass}>
                    Desconto (R$)
                  </label>

                  <CurrencyInput
                    className={fieldClass}
                    value={form.discountValue}
                    onChange={(value) =>
                      setForm({
                        ...form,
                        discountValue: value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Frete (R$)
                  </label>

                  <CurrencyInput
                    className={fieldClass}
                    value={form.freightValue}
                    onChange={(value) =>
                      setForm({
                        ...form,
                        freightValue: value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Outras despesas (R$)
                  </label>

                  <CurrencyInput
                    className={fieldClass}
                    value={form.otherExpenses}
                    onChange={(value) =>
                      setForm({
                        ...form,
                        otherExpenses: value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-4">
                <div>
                  <label className={labelClass}>
                    Dias a vencer
                  </label>

                  <input
                    type="number"
                    min={0}
                    placeholder="0"
                    className={fieldClass}
                    value={form.termDays}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        termDays: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Número de parcelas
                  </label>

                  <input
                    type="number"
                    min={1}
                    placeholder="1"
                    title="Gera essa quantidade de parcelas abaixo, já calculadas — dá pra editar antes de salvar"
                    className={fieldClass}
                    value={form.installmentsCount}
                    onChange={(e) => {
                      const value = e.target.value;

                      setForm({
                        ...form,
                        installmentsCount: value,
                      });

                      const count = Number(value) || 1;

                      setInstallments(
                        buildInstallmentRows(
                          form.quoteDate || undefined,
                          Number(form.termDays) || 0,
                          count,
                          netTotal
                        )
                      );
                    }}
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Forma de pagamento
                  </label>

                  <select
                    className={fieldClass}
                    value={form.paymentMethod}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        paymentMethod: e.target
                          .value as PaymentMethod | "",
                      })
                    }
                  >
                    <option value="">Selecione...</option>

                    {Object.entries(PAYMENT_METHOD_LABELS).map(
                      ([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>
                    Tipo de receita
                  </label>

                  <SearchSelect<ChartOfAccount>
                    displayLabel={form.chartOfAccountLabel}
                    search={searchChartOfAccounts}
                    getId={(c) => c.id}
                    getLabel={(c) => `${c.code} — ${c.description}`}
                    placeholder="Digite para buscar a conta..."
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

              <InstallmentsEditor
                installments={installments}
                onUpdate={updateInstallment}
                onAdd={addInstallment}
                onRemove={removeInstallment}
                total={netTotal}
                totalLabel="valor líquido"
              />

              <div className="flex justify-end gap-6 text-sm">
                <span className="text-[var(--text-secondary)]">
                  Total dos itens: {money(itemsTotal)}
                </span>

                <span className="font-semibold text-[var(--text-primary)]">
                  Líquido: {money(netTotal)}
                </span>
              </div>

              {formError && (
                <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                  {formError}
                </div>
              )}
            </div>
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
                  onClick={() => void saveForm()}
                  className="rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] disabled:opacity-60"
                >
                  {saving ? "Salvando..." : "Salvar"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
