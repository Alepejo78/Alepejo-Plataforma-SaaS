"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Check,
  Eye,
  FileText,
  PackageCheck,
  Pencil,
  Plus,
  Trash2,
  Undo2,
  Upload,
  X,
  XCircle,
} from "lucide-react";

import { AppShell } from "@/components";
import { Can } from "@/components/auth/Can";
import { ListPageLayout } from "@/components/layout/ListPageLayout";
import { SearchSelect } from "@/components/ui/SearchSelect";
import { InvoiceImportModal } from "@/components/invoice-import/InvoiceImportModal";
import {
  chartOfAccountService,
  type ChartOfAccount,
} from "@/services/chart-of-account.service";
import { CurrencyInput } from "@/components/ui/CurrencyInput";

import {
  PURCHASE_STATUS_LABELS,
  formatPurchaseNumber,
  purchaseService,
  type Purchase,
  type PurchaseStatus,
} from "@/services/purchase.service";

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

import {
  purchaseOrderService,
  type PurchaseOrder,
} from "@/services/purchase-order.service";

import { calculateDueDatePreview } from "@/lib/dueDate";

function num(value: string | number | null | undefined) {
  return Number(value ?? 0);
}

function qty(value: string | number | null | undefined) {
  return num(value).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
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

const STATUS_BADGE_CLASS: Record<PurchaseStatus, string> = {
  DRAFT:
    "bg-[var(--surface-hover)] text-[var(--text-secondary)]",
  APPROVED: "bg-[var(--primary-soft)] text-[var(--primary)]",
  RECEIVED: "bg-[var(--success-soft)] text-[var(--success)]",
  CANCELLED: "bg-[var(--danger-soft)] text-[var(--danger)]",
};

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

export default function ComprasPage() {
  const router = useRouter();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>(
    []
  );

  const [statusFilter, setStatusFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");

  // Modal de nova compra / edição (rascunho)
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(
    null
  );
  const [form, setForm] = useState({
    partnerId: "",
    partnerLabel: "",
    warehouseId: "",
    purchaseDate: "",
    observation: "",
    termDays: "",
    paymentMethod: "" as PaymentMethod | "",
    chartOfAccountId: "",
    chartOfAccountLabel: "",
  });
  const [items, setItems] = useState<ItemForm[]>([
    emptyItem(),
  ]);

  const [barcodeInput, setBarcodeInput] = useState("");
  const [barcodeError, setBarcodeError] = useState("");

  // Criar a compra a partir de um pedido de compra
  const [sourceOrderId, setSourceOrderId] = useState("");
  const [sourceOrderLabel, setSourceOrderLabel] =
    useState("");

  // Modal de detalhes
  const [detail, setDetail] = useState<Purchase | null>(null);

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

  const searchSuppliers = useCallback(
    async (query: string) => {
      const result = await partnerService.list({
        role: "SUPPLIER",
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

  const searchPurchaseOrders = useCallback(
    async (query: string) => {
      const result = await purchaseOrderService.list({
        status: "DRAFT",
      });

      const q = query.trim().toLowerCase();

      if (!q) {
        return result;
      }

      return result.filter(
        (it) =>
          `pc-${String(it.number).padStart(6, "0")}`.includes(
            q
          ) ||
          (it.partner?.tradeName ??
            it.partner?.legalName ??
            ""
          )
            .toLowerCase()
            .includes(q)
      );
    },
    []
  );

  async function applyPurchaseOrder(order: PurchaseOrder) {
    setSourceOrderId(order.id);
    setSourceOrderLabel(
      `PC-${String(order.number).padStart(6, "0")}`
    );

    setForm((prev) => ({
      ...prev,
      partnerId: order.partnerId,
      partnerLabel:
        order.partner?.tradeName ??
        order.partner?.legalName ??
        "",
      warehouseId: order.warehouseId,
    }));

    setItems(
      order.items.map((it) => ({
        productId: it.productId,
        productLabel: it.product
          ? `${it.product.code} — ${it.product.description}`
          : "",
        quantity: String(num(it.quantity)),
        unitPrice: num(it.unitPrice),
      }))
    );
  }

  function clearSourceOrder() {
    setSourceOrderId("");
    setSourceOrderLabel("");
  }

  const load = useCallback(async () => {
    setLoading(true);
    setListError("");

    try {
      const result = await purchaseService.list({
        status: (statusFilter || undefined) as
          | PurchaseStatus
          | undefined,
        search: search || undefined,
      });

      setPurchases(result);
    } catch (err) {
      setListError(
        extractMessage(
          err,
          "Não foi possível carregar as compras."
        )
      );
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const timer = setTimeout(
      () => setSearch(searchInput.trim()),
      300
    );

    return () => clearTimeout(timer);
  }, [searchInput]);

  function openCreate() {
    setEditingId(null);
    setForm({
      partnerId: "",
      partnerLabel: "",
      chartOfAccountId: "",
      chartOfAccountLabel: "",
      warehouseId: warehouses[0]?.id ?? "",
      purchaseDate: "",
      observation: "",
      termDays: "",
      paymentMethod: "",
    });
    setItems([emptyItem()]);
    setBarcodeInput("");
    setBarcodeError("");
    clearSourceOrder();
    setFormError("");
    setCreateOpen(true);
  }

  function openEdit(purchase: Purchase) {
    setEditingId(purchase.id);
    setForm({
      partnerId: purchase.partnerId,
      partnerLabel:
        purchase.partner?.tradeName ??
        purchase.partner?.legalName ??
        "",
      warehouseId: purchase.warehouseId,
      purchaseDate: purchase.purchaseDate
        ? purchase.purchaseDate.slice(0, 10)
        : "",
      observation: purchase.observation ?? "",
      termDays: purchase.termDays
        ? String(purchase.termDays)
        : "",
      paymentMethod: purchase.paymentMethod ?? "",
      chartOfAccountId: purchase.chartOfAccountId ?? "",
      chartOfAccountLabel: purchase.chartOfAccount
        ? `${purchase.chartOfAccount.code} — ${purchase.chartOfAccount.description}`
        : "",
    });
    setItems(
      purchase.items.map((it) => ({
        productId: it.productId,
        productLabel: it.product
          ? `${it.product.code} — ${it.product.description}`
          : "",
        quantity: String(num(it.quantity)),
        unitPrice: num(it.unitPrice),
      }))
    );
    setBarcodeInput("");
    setBarcodeError("");
    clearSourceOrder();
    setFormError("");
    setCreateOpen(true);
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

  async function handleBarcodeSubmit() {
    const code = barcodeInput.trim();

    if (!code) {
      return;
    }

    setBarcodeError("");

    try {
      const result = await productService.list({
        barcode: code,
        limit: 1,
      });

      const product = result.data?.[0];

      if (!product) {
        setBarcodeError(
          `Nenhum produto encontrado para o código de barras "${code}".`
        );

        return;
      }

      setItems((prev) => {
        const existingIndex = prev.findIndex(
          (it) => it.productId === product.id
        );

        if (existingIndex >= 0) {
          return prev.map((it, i) =>
            i === existingIndex
              ? {
                  ...it,
                  quantity: String(
                    decimal(it.quantity) + 1
                  ),
                }
              : it
          );
        }

        const newItem: ItemForm = {
          productId: product.id,
          productLabel: `${product.code} — ${product.description}`,
          quantity: "1",
          unitPrice: num(product.cost),
        };

        const emptyIndex = prev.findIndex(
          (it) => !it.productId
        );

        if (emptyIndex >= 0) {
          return prev.map((it, i) =>
            i === emptyIndex ? newItem : it
          );
        }

        return [...prev, newItem];
      });

      setBarcodeInput("");
    } catch (err) {
      setBarcodeError(
        extractMessage(
          err,
          "Não foi possível buscar o produto pelo código de barras."
        )
      );
    }
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  const itemsTotal = items.reduce(
    (sum, it) => sum + decimal(it.quantity) * it.unitPrice,
    0
  );

  async function saveCreate() {
    if (!form.partnerId || !form.warehouseId) {
      setFormError("Selecione o fornecedor e o depósito.");

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

    setSaving(true);
    setFormError("");

    const payload = {
      partnerId: form.partnerId,
      warehouseId: form.warehouseId,
      purchaseDate: form.purchaseDate || undefined,
      observation: form.observation || undefined,
      termDays: form.termDays ? Number(form.termDays) : undefined,
      paymentMethod: form.paymentMethod || undefined,
      chartOfAccountId: form.chartOfAccountId || undefined,
      purchaseOrderId: sourceOrderId || undefined,
      items: validItems.map((it) => ({
        productId: it.productId,
        quantity: decimal(it.quantity),
        unitPrice: it.unitPrice,
      })),
    };

    try {
      if (editingId) {
        await purchaseService.update(editingId, payload);
      } else {
        await purchaseService.create(payload);
      }

      setCreateOpen(false);

      await load();
    } catch (err) {
      setFormError(
        extractMessage(
          err,
          editingId
            ? "Não foi possível salvar as alterações."
            : "Não foi possível cadastrar a compra."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  async function runAction(
    id: string,
    action: "approve" | "cancel" | "unreceive"
  ) {
    setActionId(id);
    setActionError("");

    try {
      if (action === "approve") {
        await purchaseService.approve(id);
      } else if (action === "unreceive") {
        await purchaseService.unreceive(id);
      } else {
        await purchaseService.cancel(id);
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

  const semDeposito = warehouses.length === 0;

  return (
    <AppShell workspaceLabel="Compras">
      <ListPageLayout
        header={
          <>
            <header className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                  Compras
                </h1>

                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Lançamento e aprovação de compras.
                </p>
              </div>

              <div className="flex gap-2">
                <Link
                  href="/erp/compras/relatorio"
                  target="_blank"
                  className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                >
                  <FileText size={18} />
                  Relatório
                </Link>

                <Can permission="purchase.create">
                  <button
                    type="button"
                    onClick={() => setImportOpen(true)}
                    className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                  >
                    <Upload size={18} />
                    Importar nota fiscal
                  </button>

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
                    Nova compra
                  </button>
                </Can>
              </div>
            </header>

            <div className="flex flex-wrap gap-3">
              <input
                placeholder="Buscar por número da compra ou fornecedor..."
                className={`${fieldClass} max-w-80`}
                value={searchInput}
                onChange={(e) =>
                  setSearchInput(e.target.value)
                }
              />

              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value)
                }
                className={`${fieldClass} max-w-64`}
              >
                <option value="">Todos os status</option>

                {Object.entries(PURCHASE_STATUS_LABELS).map(
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
        ) : purchases.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-medium text-[var(--text-primary)]">
              Nenhuma compra cadastrada
            </p>

            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Use &quot;Nova compra&quot; para lançar uma
              compra.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-[var(--surface-hover)] text-[var(--text-secondary)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">
                    Número
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Data
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Fornecedor
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Depósito
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Itens
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Quantidade
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Total
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Vencimento
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Status
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>

              <tbody>
                {purchases.map((p) => {
                  const busy = actionId === p.id;

                  return (
                    <tr
                      key={p.id}
                      className="border-t border-[var(--border)]"
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-[var(--text-primary)]">
                        {formatPurchaseNumber(p.number)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-[var(--text-secondary)]">
                        {date(
                          p.purchaseDate ?? p.createdAt
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <p className="font-medium text-[var(--text-primary)]">
                          {p.partner?.tradeName ??
                            p.partner?.legalName ??
                            "—"}
                        </p>
                      </td>

                      <td className="px-4 py-3 text-[var(--text-secondary)]">
                        {p.warehouse?.code ?? "—"}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-right text-[var(--text-secondary)]">
                        {p.items?.length ?? 0}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-right text-[var(--text-secondary)]">
                        {qty(
                          p.items?.reduce(
                            (sum, it) => sum + num(it.quantity),
                            0
                          ) ?? 0
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-[var(--text-primary)]">
                        {money(p.totalAmount)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-[var(--text-secondary)]">
                        {date(p.dueDate)}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE_CLASS[p.status]}`}
                        >
                          {PURCHASE_STATUS_LABELS[p.status]}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setDetail(p)}
                            title="Ver itens"
                            aria-label="Ver itens"
                            className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                          >
                            <Eye size={16} />
                          </button>

                          {p.status === "DRAFT" && (
                            <Can permission="purchase.update">
                              <button
                                type="button"
                                onClick={() => openEdit(p)}
                                title="Editar"
                                aria-label="Editar"
                                className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]"
                              >
                                <Pencil size={16} />
                              </button>
                            </Can>
                          )}

                          {p.status === "DRAFT" && (
                            <Can permission="purchase.approve">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() =>
                                  void runAction(
                                    p.id,
                                    "approve"
                                  )
                                }
                                title="Aprovar"
                                aria-label="Aprovar"
                                className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:opacity-50"
                              >
                                <Check size={16} />
                              </button>
                            </Can>
                          )}

                          {p.status === "APPROVED" && (
                            <Can permission="purchase.receive">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() =>
                                  router.push(
                                    `/erp/compras/recebimento?open=${p.id}`
                                  )
                                }
                                title="Receber"
                                aria-label="Receber"
                                className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--success)] hover:text-[var(--success)] disabled:opacity-50"
                              >
                                <PackageCheck size={16} />
                              </button>
                            </Can>
                          )}

                          {p.status === "RECEIVED" && (
                            <Can permission="purchase.receive">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() =>
                                  void runAction(
                                    p.id,
                                    "unreceive"
                                  )
                                }
                                title="Estornar recebimento"
                                aria-label="Estornar recebimento"
                                className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--warning)] hover:text-[var(--warning)] disabled:opacity-50"
                              >
                                <Undo2 size={16} />
                              </button>
                            </Can>
                          )}

                          {(p.status === "DRAFT" ||
                            p.status === "APPROVED") && (
                            <Can permission="purchase.cancel">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() =>
                                  void runAction(
                                    p.id,
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

      {importOpen && (
        <InvoiceImportModal
          direction="PURCHASE"
          warehouses={warehouses}
          onClose={() => setImportOpen(false)}
          onSaved={() => void load()}
        />
      )}

      {/* Nova compra */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-8 w-full max-w-5xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                {editingId ? "Editar compra" : "Nova compra"}
              </h2>

              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                aria-label="Fechar"
                className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-[var(--border)] p-3">
                <label className={labelClass}>
                  Criar a partir de pedido de compra
                  (opcional)
                </label>

                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <SearchSelect<PurchaseOrder>
                      displayLabel={sourceOrderLabel}
                      search={searchPurchaseOrders}
                      getId={(o) => o.id}
                      getLabel={(o) =>
                        `PC-${String(o.number).padStart(6, "0")}`
                      }
                      getSubLabel={(o) =>
                        o.partner?.tradeName ??
                        o.partner?.legalName
                      }
                      placeholder="Digite para buscar o pedido de compra..."
                      onSelect={(o) =>
                        o
                          ? void applyPurchaseOrder(o)
                          : clearSourceOrder()
                      }
                    />
                  </div>
                </div>

                {sourceOrderId && (
                  <p className="mt-2 text-xs text-[var(--text-muted)]">
                    Dados preenchidos a partir de{" "}
                    {sourceOrderLabel}. Complete o restante e
                    confirme a compra.
                  </p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="sm:col-span-2 lg:col-span-1">
                  <label className={labelClass}>
                    Fornecedor
                  </label>

                  <SearchSelect<BusinessPartner>
                    displayLabel={form.partnerLabel}
                    search={searchSuppliers}
                    getId={(p) => p.id}
                    getLabel={(p) =>
                      p.tradeName ?? p.legalName
                    }
                    getSubLabel={(p) => p.document}
                    placeholder="Digite para buscar o fornecedor..."
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
                    Data da compra
                  </label>

                  <input
                    type="date"
                    className={fieldClass}
                    value={form.purchaseDate}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        purchaseDate: e.target.value,
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

              <div className="grid gap-4 sm:grid-cols-3">
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
                    Vencimento (calculado)
                  </label>

                  <div className={`${fieldClass} flex items-center text-[var(--text-secondary)]`}>
                    {date(
                      calculateDueDatePreview(
                        form.purchaseDate,
                        Number(form.termDays) || 0
                      ).toISOString()
                    )}
                  </div>
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
                    Tipo de despesa
                  </label>

                  {/* Vai junto pro título de contas a pagar gerado no
                      recebimento — é o que alimenta o gráfico de
                      despesas por tipo. */}
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

              <div>
                <label className={labelClass}>
                  Código de barras
                </label>

                <input
                  placeholder="Escaneie ou digite o código de barras e pressione Enter..."
                  className={fieldClass}
                  value={barcodeInput}
                  onChange={(e) => {
                    setBarcodeInput(e.target.value);
                    setBarcodeError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void handleBarcodeSubmit();
                    }
                  }}
                />

                {barcodeError && (
                  <p className="mt-1 text-xs text-[var(--danger)]">
                    {barcodeError}
                  </p>
                )}
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
                              money(p.cost)
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
                                    ? num(p.cost)
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
                    );
                  })}
                </div>

                <div className="mt-3 flex justify-end text-sm font-semibold text-[var(--text-primary)]">
                  Total: {money(itemsTotal)}
                </div>
              </div>

              {formError && (
                <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                  {formError}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="rounded-xl border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--text-secondary)]"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void saveCreate()}
                  className="rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] disabled:opacity-60"
                >
                  {saving
                    ? "Salvando..."
                    : editingId
                      ? "Salvar alterações"
                      : "Cadastrar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detalhes */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-8 w-full max-w-3xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                  {formatPurchaseNumber(detail.number)} ·{" "}
                  {detail.partner?.tradeName ??
                    detail.partner?.legalName}
                </h2>

                <p className="text-sm text-[var(--text-muted)]">
                  {date(
                    detail.purchaseDate ?? detail.createdAt
                  )}{" "}
                  · {detail.warehouse?.code} ·{" "}
                  {PURCHASE_STATUS_LABELS[detail.status]}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setDetail(null)}
                aria-label="Fechar"
                className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
              <table className="w-full text-left text-sm">
                <thead className="bg-[var(--surface-hover)] text-[var(--text-secondary)]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">
                      Produto
                    </th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Qtd
                    </th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Preço unit.
                    </th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Total
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {detail.items.map((it) => (
                    <tr
                      key={it.id}
                      className="border-t border-[var(--border)]"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-[var(--text-primary)]">
                          {it.product?.description ?? "—"}
                        </p>

                        <p className="text-xs text-[var(--text-muted)]">
                          {it.product?.code}
                        </p>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-right text-[var(--text-secondary)]">
                        {qty(it.quantity)}{" "}
                        {it.product?.unit?.code ?? ""}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-right text-[var(--text-secondary)]">
                        {money(it.unitPrice)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-[var(--text-primary)]">
                        {money(it.totalPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {detail.observation && (
              <p className="mt-4 text-sm text-[var(--text-secondary)]">
                <span className="font-medium text-[var(--text-primary)]">
                  Observação:
                </span>{" "}
                {detail.observation}
              </p>
            )}

            <div className="mt-4 space-y-1 text-right text-sm">
              {detail.dueDate && (
                <p className="text-[var(--text-secondary)]">
                  Vencimento: {date(detail.dueDate)}
                  {detail.termDays != null &&
                    ` (${detail.termDays} dia(s))`}
                </p>
              )}

              {detail.paymentMethod && (
                <p className="text-[var(--text-secondary)]">
                  Forma de pagamento:{" "}
                  {PAYMENT_METHOD_LABELS[detail.paymentMethod]}
                </p>
              )}

              {detail.invoiceNumber && (
                <p className="text-[var(--text-secondary)]">
                  Nota fiscal: {detail.invoiceNumber}
                  {detail.invoiceIssueDate &&
                    ` — emitida em ${date(detail.invoiceIssueDate)}`}
                </p>
              )}

              {detail.invoiceKey && (
                <p
                  className="text-[var(--text-secondary)]"
                  title={detail.invoiceKey}
                >
                  Chave de acesso: {detail.invoiceKey}
                </p>
              )}

              <p className="font-semibold text-[var(--text-primary)]">
                Total: {money(detail.totalAmount)}
              </p>
            </div>
          </div>
        </div>
      )}

    </AppShell>
  );
}
