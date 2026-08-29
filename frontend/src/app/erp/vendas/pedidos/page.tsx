"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Ban,
  Edit,
  Eye,
  FileText,
  Plus,
  Trash2,
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
  SALES_ORDER_STATUS_LABELS,
  salesOrderService,
  type SalesOrder,
  type SalesOrderStatus,
} from "@/services/sales-order.service";

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
  chartOfAccountService,
  type ChartOfAccount,
} from "@/services/chart-of-account.service";

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
  return `PV-${String(n).padStart(6, "0")}`;
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

const STATUS_BADGE_CLASS: Record<SalesOrderStatus, string> = {
  DRAFT: "bg-[var(--surface-hover)] text-[var(--text-secondary)]",
  PARTIALLY_CONVERTED: "bg-[var(--warning-soft)] text-[var(--warning)]",
  CONVERTED: "bg-[var(--success-soft)] text-[var(--success)]",
  CANCELLED: "bg-[var(--danger-soft)] text-[var(--danger)]",
};

interface ItemForm {
  productId: string;
  productLabel: string;
  quantity: string;
  unitPrice: number;
  convertedQuantity: number;
  discardedQuantity: number;
}

function emptyItem(): ItemForm {
  return {
    productId: "",
    productLabel: "",
    quantity: "",
    unitPrice: 0,
    convertedQuantity: 0,
    discardedQuantity: 0,
  };
}

function emptyForm() {
  return {
    partnerId: "",
    partnerLabel: "",
    warehouseId: "",
    orderDate: todayIso(),
    observation: "",
    discountValue: 0,
    freightValue: 0,
    otherExpenses: 0,
    chartOfAccountId: "",
    chartOfAccountLabel: "",
    termDays: "",
    paymentMethod: "" as PaymentMethod | "",
    installmentsCount: "",
  };
}

export default function PedidosDeVendaPage() {
  const exportTableRef = useRef<HTMLTableElement>(null);
  const [orders, setOrders] = useState<SalesOrder[]>([]);
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

  const [detail, setDetail] = useState<SalesOrder | null>(
    null
  );

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
      const result = await salesOrderService.list({
        status: (statusFilter || undefined) as
          | SalesOrderStatus
          | undefined,
      });

      setOrders(result);
    } catch (err) {
      setListError(
        extractMessage(
          err,
          "Não foi possível carregar os pedidos de venda."
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
    setFormError("");
    setFormOpen(true);
  }

  function populateOrderForm(order: SalesOrder) {
    setForm({
      partnerId: order.partnerId,
      partnerLabel:
        order.partner?.tradeName ??
        order.partner?.legalName ??
        "",
      warehouseId: order.warehouseId,
      orderDate: order.orderDate
        ? order.orderDate.slice(0, 10)
        : "",
      observation: order.observation ?? "",
      discountValue: num(order.discountValue),
      freightValue: num(order.freightValue),
      otherExpenses: num(order.otherExpenses),
      chartOfAccountId: order.chartOfAccountId ?? "",
      chartOfAccountLabel: order.chartOfAccount
        ? `${order.chartOfAccount.code} — ${order.chartOfAccount.description}`
        : "",
      termDays:
        order.termDays != null ? String(order.termDays) : "",
      paymentMethod: order.paymentMethod ?? "",
      installmentsCount:
        order.installmentsCount != null &&
        order.installmentsCount > 1
          ? String(order.installmentsCount)
          : "",
    });
    setItems(
      order.items.map((it) => ({
        productId: it.productId,
        productLabel: it.product
          ? `${it.product.code} — ${it.product.description}`
          : "",
        quantity: String(num(it.quantity)),
        unitPrice: num(it.unitPrice),
        convertedQuantity: num(it.convertedQuantity),
        discardedQuantity: num(it.discardedQuantity),
      }))
    );
  }

  function openEdit(order: SalesOrder) {
    setEditingId(order.id);
    setViewOnly(false);
    setDetail(order);
    populateOrderForm(order);
    setFormError("");
    setFormOpen(true);
  }

  function openView(order: SalesOrder) {
    setEditingId(order.id);
    setViewOnly(true);
    setDetail(order);
    populateOrderForm(order);
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

    setSaving(true);
    setFormError("");

    const payload = {
      partnerId: form.partnerId,
      warehouseId: form.warehouseId,
      orderDate: form.orderDate || undefined,
      observation: form.observation || undefined,
      discountValue: form.discountValue || undefined,
      freightValue: form.freightValue || undefined,
      otherExpenses: form.otherExpenses || undefined,
      chartOfAccountId: form.chartOfAccountId,
      termDays: Number(form.termDays),
      paymentMethod: form.paymentMethod as PaymentMethod,
      installmentsCount: form.installmentsCount
        ? Number(form.installmentsCount)
        : undefined,
      items: validItems.map((it) => ({
        productId: it.productId,
        quantity: decimal(it.quantity),
        unitPrice: it.unitPrice,
      })),
    };

    try {
      if (editingId) {
        await salesOrderService.update(editingId, payload);
      } else {
        await salesOrderService.create(payload);
      }

      setFormOpen(false);

      await load();
    } catch (err) {
      setFormError(
        extractMessage(
          err,
          "Não foi possível salvar o pedido de venda."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  async function cancelOrder(id: string) {
    setActionId(id);
    setActionError("");

    try {
      await salesOrderService.cancel(id);

      await load();
    } catch (err) {
      setActionError(
        extractMessage(
          err,
          "Não foi possível cancelar o pedido de venda."
        )
      );
    } finally {
      setActionId("");
    }
  }

  async function closeBalanceOrder(id: string) {
    if (
      !window.confirm(
        "Zerar o saldo restante deste pedido? Ele será marcado como convertido, sem gerar nenhuma venda pra sobra — não tem como desfazer."
      )
    ) {
      return;
    }

    setActionId(id);
    setActionError("");

    try {
      await salesOrderService.closeBalance(id);

      await load();
    } catch (err) {
      setActionError(
        extractMessage(
          err,
          "Não foi possível zerar o saldo do pedido de venda."
        )
      );
    } finally {
      setActionId("");
    }
  }

  const semDeposito = warehouses.length === 0;

  return (
    <AppShell workspaceLabel="Pedidos de venda">
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
                    Pedidos de venda
                  </h1>

                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    Compromisso firmado com o cliente. Ao
                    virar venda, ficam bloqueados para
                    edição.
                  </p>
                </div>

                <div className="flex gap-2">
                  <ExportButton
                    tableRef={exportTableRef}
                    filename="pedidos-de-venda"
                    sheetName="Pedidos de venda"
                  />

                  <Link
                    href="/erp/vendas/pedidos/relatorio"
                    target="_blank"
                    className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                  >
                    <FileText size={18} />
                    Relatório
                  </Link>

                  <Can permission="sales-order.create">
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
                      Novo pedido
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

                {Object.entries(
                  SALES_ORDER_STATUS_LABELS
                ).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
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
        ) : orders.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-medium text-[var(--text-primary)]">
              Nenhum pedido de venda cadastrado
            </p>

            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Use &quot;Novo pedido&quot; para começar.
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
                {orders.map((o) => {
                  const busy = actionId === o.id;

                  return (
                    <tr
                      key={o.id}
                      className="border-t border-[var(--border)]"
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-[var(--text-primary)]">
                        {formatNumber(o.number)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-[var(--text-secondary)]">
                        {date(o.orderDate ?? o.createdAt)}
                      </td>

                      <td className="px-4 py-3">
                        <p className="font-medium text-[var(--text-primary)]">
                          {o.partner?.tradeName ??
                            o.partner?.legalName ??
                            "—"}
                        </p>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-[var(--text-primary)]">
                        {money(o.netAmount)}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE_CLASS[o.status]}`}
                        >
                          {
                            SALES_ORDER_STATUS_LABELS[
                              o.status
                            ]
                          }
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openView(o)}
                            title="Consultar"
                            aria-label="Consultar"
                            className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                          >
                            <Eye size={16} />
                          </button>

                          {o.status === "DRAFT" && (
                            <>
                              <Can permission="sales-order.update">
                                <button
                                  type="button"
                                  onClick={() =>
                                    openEdit(o)
                                  }
                                  title="Editar"
                                  aria-label="Editar"
                                  className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]"
                                >
                                  <Edit size={16} />
                                </button>
                              </Can>

                              <Can permission="sales-order.cancel">
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() =>
                                    void cancelOrder(o.id)
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

                          {(o.status === "DRAFT" ||
                            o.status ===
                              "PARTIALLY_CONVERTED") && (
                            <Can permission="sales-order.cancel">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() =>
                                  void closeBalanceOrder(o.id)
                                }
                                title="Zerar saldo (fecha o pedido sem gerar venda pra sobra)"
                                aria-label="Zerar saldo"
                                className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--warning)] hover:text-[var(--warning)] disabled:opacity-50"
                              >
                                <Ban size={16} />
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

      {/* Novo/editar/consultar pedido */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-8 w-full max-w-5xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                  {viewOnly
                    ? "Consultar pedido de venda"
                    : editingId
                      ? "Editar pedido de venda"
                      : "Novo pedido de venda"}
                </h2>

                {viewOnly && detail && (
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    {SALES_ORDER_STATUS_LABELS[detail.status]}
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
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                    Data do pedido
                  </label>

                  <input
                    type="date"
                    className={fieldClass}
                    value={form.orderDate}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        orderDate: e.target.value,
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

              <div className="grid gap-4 sm:grid-cols-4">
                <div>
                  <label className={labelClass}>
                    Tipo de receita
                  </label>

                  <SearchSelect<ChartOfAccount>
                    displayLabel={form.chartOfAccountLabel}
                    search={searchChartOfAccounts}
                    getId={(c) => c.id}
                    getLabel={(c) =>
                      `${c.code} — ${c.description}`
                    }
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

                <div>
                  <label className={labelClass}>
                    Prazo (dias)
                  </label>

                  <input
                    type="number"
                    min={0}
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
                    title="Em quantos títulos o vencimento se divide — 30/60/90 com prazo 30 e 3 parcelas"
                    className={fieldClass}
                    value={form.installmentsCount}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        installmentsCount: e.target.value,
                      })
                    }
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
                    const saldo =
                      decimal(it.quantity) -
                      it.convertedQuantity -
                      it.discardedQuantity;

                    return (
                      <div
                        key={index}
                        className="rounded-xl border border-[var(--border)] p-2"
                      >
                      <div className="grid grid-cols-12 items-start gap-2">
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
                            onSelect={(p) =>
                              updateItem(index, {
                                productId: p?.id ?? "",
                                productLabel: p
                                  ? `${p.code} — ${p.description}`
                                  : "",
                                unitPrice:
                                  p && !it.unitPrice
                                    ? num(p.salePrice)
                                    : it.unitPrice,
                              })
                            }
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

                      {viewOnly &&
                        (it.convertedQuantity > 0 ||
                          it.discardedQuantity > 0) && (
                          <p className="mt-1 px-1 text-xs text-[var(--text-muted)]">
                            Convertido: {it.convertedQuantity}
                            {it.discardedQuantity > 0 &&
                              ` · Descartado: ${it.discardedQuantity}`}{" "}
                            · Saldo: {saldo}
                          </p>
                        )}
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
