"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Check,
  Eye,
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
  SALE_STATUS_LABELS,
  formatSaleNumber,
  saleService,
  type Sale,
  type SaleFinancialEntry,
  type SaleStatus,
} from "@/services/sale.service";

import {
  partnerService,
  type BusinessPartner,
} from "@/services/partner.service";

import {
  inventoryService,
  warehouseService,
  type InventoryItem,
  type Warehouse,
} from "@/services/inventory.service";

import {
  productService,
  type Product,
} from "@/services/product.service";

import {
  DOCUMENT_TYPE_LABELS,
  FINANCIAL_ENTRY_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  financialEntryService,
  type FinancialDocumentType,
  type PaymentMethod,
} from "@/services/financial-entry.service";

import {
  quoteService,
  type Quote,
} from "@/services/quote.service";

import {
  salesOrderService,
  type SalesOrder,
} from "@/services/sales-order.service";

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

function availableOf(item: InventoryItem) {
  return (
    num(item.quantity) -
    num(item.blockedQuantity) -
    num(item.reservedQuantity) -
    num(item.quarantineQuantity) -
    num(item.damagedQuantity)
  );
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

const STATUS_BADGE_CLASS: Record<SaleStatus, string> = {
  DRAFT:
    "bg-[var(--surface-hover)] text-[var(--text-secondary)]",
  APPROVED: "bg-[var(--primary-soft)] text-[var(--primary)]",
  INVOICED: "bg-[var(--success-soft)] text-[var(--success)]",
  SHIPPED: "bg-[var(--success-soft)] text-[var(--success)]",
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

export default function VendasPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>(
    []
  );

  const [statusFilter, setStatusFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");

  // Modal de nova venda / edição (rascunho)
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(
    null
  );
  const [viewOnly, setViewOnly] = useState(false);
  const [form, setForm] = useState({
    partnerId: "",
    partnerLabel: "",
    warehouseId: "",
    saleDate: "",
    observation: "",
    discountValue: 0,
    freightValue: 0,
    otherExpenses: 0,
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

  // Criar a venda a partir de um orçamento ou pedido de venda
  const [sourceType, setSourceType] = useState<
    "" | "quote" | "salesOrder"
  >("");
  const [sourceId, setSourceId] = useState("");
  const [sourceLabel, setSourceLabel] = useState("");
  const [sourceError, setSourceError] = useState("");

  // Modal de detalhes
  const [detail, setDetail] = useState<Sale | null>(null);

  // Edição do vencimento das parcelas já lançadas (consulta)
  const [entryDays, setEntryDays] = useState<
    Record<string, string>
  >({});
  const [entryDates, setEntryDates] = useState<
    Record<string, string>
  >({});
  const [entrySavingId, setEntrySavingId] = useState("");
  const [entryError, setEntryError] = useState("");

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [actionId, setActionId] = useState("");
  const [actionError, setActionError] = useState("");

  // Aprovação (dados fiscais da nota fiscal de venda)
  const [approveTarget, setApproveTarget] =
    useState<Sale | null>(null);
  const [approveForm, setApproveForm] = useState({
    invoiceNumber: "",
    invoiceKey: "",
    invoiceIssueDate: "",
    documentType: "" as FinancialDocumentType | "",
    termDays: "",
    paymentMethod: "" as PaymentMethod | "",
  });
  const [approveError, setApproveError] = useState("");

  // Confirmação ao cadastrar a venda (checa saldo disponível antes)
  const [confirmCreateOpen, setConfirmCreateOpen] =
    useState(false);
  const [confirmItems, setConfirmItems] = useState<
    {
      productId: string;
      description: string;
      unit: string;
      needed: number;
      available: number;
    }[]
  >([]);
  const [confirmChecking, setConfirmChecking] =
    useState(false);
  const [confirmError, setConfirmError] = useState("");

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

  const load = useCallback(async () => {
    setLoading(true);
    setListError("");

    try {
      const result = await saleService.list({
        status: (statusFilter || undefined) as
          | SaleStatus
          | undefined,
        search: search || undefined,
      });

      setSales(result);
    } catch (err) {
      setListError(
        extractMessage(
          err,
          "Não foi possível carregar as vendas."
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
    setViewOnly(false);
    setDetail(null);
    setForm({
      partnerId: "",
      partnerLabel: "",
      warehouseId: warehouses[0]?.id ?? "",
      saleDate: "",
      observation: "",
      discountValue: 0,
      freightValue: 0,
      otherExpenses: 0,
      termDays: "",
      paymentMethod: "",
      chartOfAccountId: "",
      chartOfAccountLabel: "",
    });
    setItems([emptyItem()]);
    setBarcodeInput("");
    setBarcodeError("");
    setSourceType("");
    setSourceId("");
    setSourceLabel("");
    setSourceError("");
    setFormError("");
    setCreateOpen(true);
  }

  function populateSaleForm(sale: Sale) {
    setForm({
      partnerId: sale.partnerId,
      partnerLabel:
        sale.partner?.tradeName ??
        sale.partner?.legalName ??
        "",
      warehouseId: sale.warehouseId,
      saleDate: sale.saleDate
        ? sale.saleDate.slice(0, 10)
        : "",
      observation: sale.observation ?? "",
      discountValue: num(sale.discountValue),
      freightValue: num(sale.freightValue),
      otherExpenses: num(sale.otherExpenses),
      termDays: sale.termDays ? String(sale.termDays) : "",
      paymentMethod: sale.paymentMethod ?? "",
      chartOfAccountId: sale.chartOfAccountId ?? "",
      chartOfAccountLabel: sale.chartOfAccount
        ? `${sale.chartOfAccount.code} — ${sale.chartOfAccount.description}`
        : "",
    });
    setItems(
      sale.items.map((it) => ({
        productId: it.productId,
        productLabel: it.product
          ? `${it.product.code} — ${it.product.description}`
          : "",
        quantity: String(num(it.quantity)),
        unitPrice: num(it.unitPrice),
      }))
    );
  }

  function openEdit(sale: Sale) {
    setEditingId(sale.id);
    setViewOnly(false);
    setDetail(sale);
    populateSaleForm(sale);
    setBarcodeInput("");
    setBarcodeError("");
    setSourceType("");
    setSourceId("");
    setSourceLabel("");
    setSourceError("");
    setFormError("");
    setCreateOpen(true);
  }

  function openView(sale: Sale) {
    setEditingId(sale.id);
    setViewOnly(true);
    setDetail(sale);
    populateSaleForm(sale);
    setBarcodeInput("");
    setBarcodeError("");
    setSourceType("");
    setSourceId("");
    setSourceLabel("");
    setSourceError("");
    setFormError("");
    setEntryDays({});
    setEntryDates({});
    setEntryError("");
    setCreateOpen(true);
  }

  function entryDueDate(entry: SaleFinancialEntry) {
    return entryDates[entry.id] ?? entry.dueDate.slice(0, 10);
  }

  function updateEntryDays(
    entry: SaleFinancialEntry,
    days: string
  ) {
    setEntryDays((prev) => ({ ...prev, [entry.id]: days }));

    if (days) {
      setEntryDates((prev) => ({
        ...prev,
        [entry.id]: calculateDueDatePreview(
          form.saleDate || undefined,
          Number(days) || 0
        )
          .toISOString()
          .slice(0, 10),
      }));
    }
  }

  async function saveEntryDueDate(entry: SaleFinancialEntry) {
    setEntrySavingId(entry.id);
    setEntryError("");

    try {
      await financialEntryService.update(entry.id, {
        dueDate: entryDueDate(entry),
      });

      if (editingId) {
        const fresh = await saleService.getById(editingId);

        setDetail(fresh);
      }

      setEntryDays((prev) => {
        const next = { ...prev };

        delete next[entry.id];

        return next;
      });

      setEntryDates((prev) => {
        const next = { ...prev };

        delete next[entry.id];

        return next;
      });
    } catch (err) {
      setEntryError(
        extractMessage(
          err,
          "Não foi possível salvar o vencimento."
        )
      );
    } finally {
      setEntrySavingId("");
    }
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
          unitPrice: num(product.salePrice),
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

  const searchQuotes = useCallback(async (query: string) => {
    const result = await quoteService.list({
      status: "DRAFT",
    });

    const q = query.trim().toLowerCase();

    if (!q) {
      return result;
    }

    return result.filter(
      (it) =>
        `orc-${String(it.number).padStart(6, "0")}`.includes(
          q
        ) ||
        (it.partner?.tradeName ??
          it.partner?.legalName ??
          ""
        )
          .toLowerCase()
          .includes(q)
    );
  }, []);

  const searchSalesOrders = useCallback(
    async (query: string) => {
      const result = await salesOrderService.list({
        status: "DRAFT",
      });

      const q = query.trim().toLowerCase();

      if (!q) {
        return result;
      }

      return result.filter(
        (it) =>
          `pv-${String(it.number).padStart(
            6,
            "0"
          )}`.includes(q) ||
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

  async function applySource(
    type: "quote" | "salesOrder",
    doc: Quote | SalesOrder
  ) {
    setSourceError("");
    setSourceType(type);
    setSourceId(doc.id);
    setSourceLabel(
      `${type === "quote" ? "ORC" : "PV"}-${String(
        doc.number
      ).padStart(6, "0")}`
    );

    setForm((prev) => ({
      ...prev,
      partnerId: doc.partnerId,
      partnerLabel:
        doc.partner?.tradeName ??
        doc.partner?.legalName ??
        "",
      warehouseId: doc.warehouseId,
      discountValue: num(doc.discountValue),
      freightValue: num(doc.freightValue),
      otherExpenses: num(doc.otherExpenses),
    }));

    setItems(
      doc.items.map((it) => ({
        productId: it.productId,
        productLabel: it.product
          ? `${it.product.code} — ${it.product.description}`
          : "",
        quantity: String(num(it.quantity)),
        unitPrice: num(it.unitPrice),
      }))
    );
  }

  function clearSource() {
    setSourceType("");
    setSourceId("");
    setSourceLabel("");
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

  async function saveCreate(): Promise<boolean> {
    if (!form.partnerId || !form.warehouseId) {
      setFormError("Selecione o cliente e o depósito.");

      return false;
    }

    const validItems = items.filter(
      (it) => it.productId && decimal(it.quantity) > 0
    );

    if (validItems.length === 0) {
      setFormError(
        "Adicione ao menos um item com produto e quantidade."
      );

      return false;
    }

    setSaving(true);
    setFormError("");

    const payload = {
      partnerId: form.partnerId,
      warehouseId: form.warehouseId,
      saleDate: form.saleDate || undefined,
      observation: form.observation || undefined,
      discountValue: form.discountValue || undefined,
      freightValue: form.freightValue || undefined,
      otherExpenses: form.otherExpenses || undefined,
      termDays: form.termDays ? Number(form.termDays) : undefined,
      paymentMethod: form.paymentMethod || undefined,
      chartOfAccountId: form.chartOfAccountId || undefined,
      quoteId:
        sourceType === "quote" && sourceId
          ? sourceId
          : undefined,
      salesOrderId:
        sourceType === "salesOrder" && sourceId
          ? sourceId
          : undefined,
      items: validItems.map((it) => ({
        productId: it.productId,
        quantity: decimal(it.quantity),
        unitPrice: it.unitPrice,
      })),
    };

    try {
      if (editingId) {
        await saleService.update(editingId, payload);
      } else {
        await saleService.create(payload);
      }

      setCreateOpen(false);

      await load();

      return true;
    } catch (err) {
      setFormError(
        extractMessage(
          err,
          editingId
            ? "Não foi possível salvar as alterações."
            : "Não foi possível cadastrar a venda."
        )
      );

      return false;
    } finally {
      setSaving(false);
    }
  }

  async function runAction(
    id: string,
    action: "cancel" | "undoApproval"
  ) {
    setActionId(id);
    setActionError("");

    try {
      if (action === "undoApproval") {
        await saleService.undoApproval(id);
      } else {
        await saleService.cancel(id);
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

  async function handleRemove(sale: Sale) {
    const confirmed = window.confirm(
      `Excluir a venda ${formatSaleNumber(sale.number)}? Essa ação não pode ser desfeita.`
    );

    if (!confirmed) {
      return;
    }

    setActionId(sale.id);
    setActionError("");

    try {
      await saleService.remove(sale.id);
      await load();
    } catch (err) {
      setActionError(
        extractMessage(err, "Não foi possível excluir a venda.")
      );
    } finally {
      setActionId("");
    }
  }

  function openApprove(sale: Sale) {
    setApproveTarget(sale);
    setApproveForm({
      invoiceNumber: "",
      invoiceKey: "",
      invoiceIssueDate: "",
      documentType: "",
      termDays:
        sale.termDays != null ? String(sale.termDays) : "",
      paymentMethod: sale.paymentMethod ?? "",
    });
    setApproveError("");
  }

  async function confirmApprove() {
    if (!approveTarget) {
      return;
    }

    setActionId(approveTarget.id);
    setApproveError("");

    try {
      await saleService.approve(approveTarget.id, {
        invoiceNumber: approveForm.invoiceNumber || undefined,
        invoiceKey: approveForm.invoiceKey || undefined,
        invoiceIssueDate:
          approveForm.invoiceIssueDate || undefined,
        documentType: approveForm.documentType || undefined,
        termDays: approveForm.termDays
          ? Number(approveForm.termDays)
          : undefined,
        paymentMethod: approveForm.paymentMethod || undefined,
      });

      setApproveTarget(null);

      await load();
    } catch (err) {
      setApproveError(
        extractMessage(
          err,
          "Não foi possível aprovar a venda."
        )
      );
    } finally {
      setActionId("");
    }
  }

  async function openCreateConfirm() {
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

    setFormError("");
    setConfirmError("");
    setConfirmItems([]);
    setConfirmChecking(true);

    try {
      const results = await Promise.all(
        validItems.map(async (it) => {
          const res = await inventoryService.list({
            productId: it.productId,
            warehouseId: form.warehouseId,
            limit: 1,
          });

          const inventory = res.data?.[0];

          return {
            productId: it.productId,
            description: it.productLabel || it.productId,
            unit: "",
            needed: decimal(it.quantity),
            available: inventory
              ? availableOf(inventory)
              : 0,
          };
        })
      );

      setConfirmItems(results);
      setConfirmChecking(false);

      const insuficiente = results.some(
        (it) => it.available < it.needed
      );

      if (insuficiente) {
        // Aprovação continua travando por saldo — aqui é só um
        // aviso: deixa registrar a venda em rascunho mesmo assim.
        setConfirmCreateOpen(true);
      } else {
        await saveCreate();
      }
    } catch {
      // Não foi possível checar o saldo — não trava o cadastro
      // por causa disso, só segue sem o aviso.
      setConfirmChecking(false);

      await saveCreate();
    }
  }

  async function confirmCreate() {
    const ok = await saveCreate();

    if (ok) {
      setConfirmCreateOpen(false);
    }
  }

  const semDeposito = warehouses.length === 0;

  return (
    <AppShell workspaceLabel="Vendas">
      <ListPageLayout
        header={
          <>
            <header className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                  Vendas
                </h1>

                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Lançamento de vendas e baixa de estoque na
                  aprovação.
                </p>
              </div>

              <Can permission="sale.create">
                <div className="flex gap-2">
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
                    Nova venda
                  </button>
                </div>
              </Can>
            </header>

            <div className="flex flex-wrap gap-3">
              <input
                placeholder="Buscar por número da venda ou cliente..."
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

                {Object.entries(SALE_STATUS_LABELS).map(
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
        ) : sales.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-medium text-[var(--text-primary)]">
              Nenhuma venda cadastrada
            </p>

            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Use &quot;Nova venda&quot; para lançar uma
              venda.
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
                    Cliente
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Depósito
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Itens
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Qtd. vendida
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Total
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Líquido
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
                {sales.map((s) => {
                  const busy = actionId === s.id;

                  return (
                    <tr
                      key={s.id}
                      className="border-t border-[var(--border)]"
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-[var(--text-primary)]">
                        {formatSaleNumber(s.number)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-[var(--text-secondary)]">
                        {date(s.saleDate ?? s.createdAt)}
                      </td>

                      <td className="px-4 py-3">
                        <p className="font-medium text-[var(--text-primary)]">
                          {s.partner?.tradeName ??
                            s.partner?.legalName ??
                            "—"}
                        </p>
                      </td>

                      <td className="px-4 py-3 text-[var(--text-secondary)]">
                        {s.warehouse?.code ?? "—"}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-right text-[var(--text-secondary)]">
                        {s.items?.length ?? 0}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-right text-[var(--text-secondary)]">
                        {qty(
                          (s.items ?? []).reduce(
                            (sum, it) =>
                              sum + num(it.quantity),
                            0
                          )
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-right text-[var(--text-secondary)]">
                        {money(s.totalAmount)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-[var(--text-primary)]">
                        {money(s.netAmount)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-[var(--text-secondary)]">
                        {date(s.dueDate)}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE_CLASS[s.status]}`}
                        >
                          {SALE_STATUS_LABELS[s.status]}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openView(s)}
                            title="Consultar"
                            aria-label="Consultar"
                            className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                          >
                            <Eye size={16} />
                          </button>

                          {s.status === "DRAFT" && (
                            <Can permission="sale.update">
                              <button
                                type="button"
                                onClick={() => openEdit(s)}
                                title="Editar"
                                aria-label="Editar"
                                className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]"
                              >
                                <Pencil size={16} />
                              </button>
                            </Can>
                          )}

                          {s.status === "DRAFT" && (
                            <Can permission="sale.approve">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => openApprove(s)}
                                title="Aprovar"
                                aria-label="Aprovar"
                                className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:opacity-50"
                              >
                                <Check size={16} />
                              </button>
                            </Can>
                          )}

                          {s.status === "DRAFT" && (
                            <Can permission="sale.cancel">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() =>
                                  void runAction(
                                    s.id,
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

                          {s.status === "APPROVED" && (
                            <Can permission="sale.cancel">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() =>
                                  void runAction(
                                    s.id,
                                    "undoApproval"
                                  )
                                }
                                title="Desfazer aprovação (volta para rascunho e devolve o estoque; só se ainda não houver recebimento no financeiro)"
                                aria-label="Desfazer aprovação"
                                className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--danger)] hover:text-[var(--danger)] disabled:opacity-50"
                              >
                                <Undo2 size={16} />
                              </button>
                            </Can>
                          )}

                          {s.status === "CANCELLED" && (
                            <Can permission="sale.delete">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() =>
                                  void handleRemove(s)
                                }
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

      {importOpen && (
        <InvoiceImportModal
          direction="SALE"
          warehouses={warehouses}
          onClose={() => setImportOpen(false)}
          onSaved={() => void load()}
        />
      )}

      {/* Nova venda */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-8 w-full max-w-5xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                  {viewOnly
                    ? "Consultar venda"
                    : editingId
                      ? "Editar venda"
                      : "Nova venda"}
                </h2>

                {viewOnly && detail && (
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    {detail.createdByName &&
                      `Criado por ${detail.createdByName} em ${date(detail.createdAt)}`}
                    {detail.createdByName &&
                      detail.updatedByName &&
                      detail.updatedByName !==
                        detail.createdByName &&
                      ` · Última alteração por ${detail.updatedByName}`}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                aria-label="Fechar"
                className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)]"
              >
                <X size={18} />
              </button>
            </div>

            <fieldset disabled={viewOnly} className="contents">
            <div className="space-y-4">
              {!editingId && (
              <div className="rounded-xl border border-[var(--border)] p-3">
                <label className={labelClass}>
                  Criar a partir de
                </label>

                <div className="mb-2 flex flex-wrap gap-2">
                  {(
                    [
                      { value: "", label: "Nenhum" },
                      {
                        value: "quote",
                        label: "Orçamento",
                      },
                      {
                        value: "salesOrder",
                        label: "Pedido de venda",
                      },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        if (!opt.value) {
                          clearSource();
                        } else {
                          setSourceType(opt.value);
                          setSourceId("");
                          setSourceLabel("");
                        }
                      }}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                        sourceType === opt.value
                          ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary-text)]"
                          : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {sourceType === "quote" && (
                  <SearchSelect<Quote>
                    displayLabel={sourceLabel}
                    search={searchQuotes}
                    getId={(q) => q.id}
                    getLabel={(q) =>
                      `ORC-${String(q.number).padStart(6, "0")}`
                    }
                    getSubLabel={(q) =>
                      q.partner?.tradeName ??
                      q.partner?.legalName
                    }
                    placeholder="Digite para buscar o orçamento..."
                    onSelect={(q) =>
                      q
                        ? void applySource("quote", q)
                        : (setSourceId(""),
                          setSourceLabel(""))
                    }
                  />
                )}

                {sourceType === "salesOrder" && (
                  <SearchSelect<SalesOrder>
                    displayLabel={sourceLabel}
                    search={searchSalesOrders}
                    getId={(o) => o.id}
                    getLabel={(o) =>
                      `PV-${String(o.number).padStart(6, "0")}`
                    }
                    getSubLabel={(o) =>
                      o.partner?.tradeName ??
                      o.partner?.legalName
                    }
                    placeholder="Digite para buscar o pedido de venda..."
                    onSelect={(o) =>
                      o
                        ? void applySource("salesOrder", o)
                        : (setSourceId(""),
                          setSourceLabel(""))
                    }
                  />
                )}

                {sourceId && (
                  <p className="mt-2 text-xs text-[var(--text-muted)]">
                    Dados preenchidos a partir de{" "}
                    {sourceLabel}. Complete o restante e
                    confirme a venda.
                  </p>
                )}

                {sourceError && (
                  <p className="mt-2 text-xs text-[var(--danger)]">
                    {sourceError}
                  </p>
                )}
              </div>
              )}

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
                    Data da venda
                  </label>

                  <input
                    type="date"
                    className={fieldClass}
                    value={form.saleDate}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        saleDate: e.target.value,
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

                              // Sugere a classificação do produto
                              // no título, se ainda não tiver
                              // escolhida uma.
                              if (
                                p?.chartOfAccountId &&
                                !form.chartOfAccountId
                              ) {
                                setForm((prev) => ({
                                  ...prev,
                                  chartOfAccountId:
                                    p.chartOfAccountId!,
                                  chartOfAccountLabel: p
                                    .chartOfAccount
                                    ? `${p.chartOfAccount.code} — ${p.chartOfAccount.description}`
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
                        form.saleDate,
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
                    Tipo de receita
                  </label>

                  {/* Vai junto pro título de contas a receber gerado
                      na aprovação da venda. */}
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

            {viewOnly &&
              detail &&
              detail.financialEntries.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-sm font-medium text-[var(--text-primary)]">
                    Lançamentos no financeiro
                  </p>

                  {entryError && (
                    <div className="mb-2 rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                      {entryError}
                    </div>
                  )}

                  <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-[var(--surface-hover)] text-[var(--text-secondary)]">
                        <tr>
                          <th className="px-4 py-2 font-semibold">
                            Dias
                          </th>
                          <th className="px-4 py-2 font-semibold">
                            Vencimento
                          </th>
                          <th className="px-4 py-2 font-semibold">
                            Documento
                          </th>
                          <th className="px-4 py-2 text-right font-semibold">
                            Valor
                          </th>
                          <th className="px-4 py-2 font-semibold">
                            Situação
                          </th>
                          <th className="px-4 py-2" />
                        </tr>
                      </thead>

                      <tbody>
                        {detail.financialEntries.map((entry) => {
                          const editableEntry =
                            entry.status === "OPEN";
                          const currentDate =
                            entryDueDate(entry);
                          const changed =
                            currentDate !==
                            entry.dueDate.slice(0, 10);
                          const entrySaving =
                            entrySavingId === entry.id;

                          return (
                            <tr
                              key={entry.id}
                              className="border-t border-[var(--border)]"
                            >
                              <td className="px-4 py-2">
                                {editableEntry ? (
                                  <input
                                    type="number"
                                    min={0}
                                    placeholder="Dias"
                                    className={`${fieldClass} h-9 w-20`}
                                    value={
                                      entryDays[entry.id] ?? ""
                                    }
                                    onChange={(e) =>
                                      updateEntryDays(
                                        entry,
                                        e.target.value
                                      )
                                    }
                                  />
                                ) : (
                                  "—"
                                )}
                              </td>
                              <td className="whitespace-nowrap px-4 py-2 text-[var(--text-secondary)]">
                                {editableEntry ? (
                                  <input
                                    type="date"
                                    className={`${fieldClass} h-9`}
                                    value={currentDate}
                                    onChange={(e) => {
                                      setEntryDays((prev) => ({
                                        ...prev,
                                        [entry.id]: "",
                                      }));
                                      setEntryDates((prev) => ({
                                        ...prev,
                                        [entry.id]:
                                          e.target.value,
                                      }));
                                    }}
                                  />
                                ) : (
                                  date(entry.dueDate)
                                )}
                              </td>
                              <td className="px-4 py-2 text-[var(--text-secondary)]">
                                {entry.documentNumber ?? "—"}
                              </td>
                              <td className="whitespace-nowrap px-4 py-2 text-right font-medium text-[var(--text-primary)]">
                                {money(entry.amount)}
                              </td>
                              <td className="px-4 py-2 text-[var(--text-secondary)]">
                                {FINANCIAL_ENTRY_STATUS_LABELS[entry.status]}
                              </td>
                              <td className="whitespace-nowrap px-4 py-2">
                                {editableEntry && changed && (
                                  <button
                                    type="button"
                                    disabled={entrySaving}
                                    onClick={() =>
                                      void saveEntryDueDate(
                                        entry
                                      )
                                    }
                                    className="rounded-lg border border-[var(--primary)] px-2 py-1 text-xs font-semibold text-[var(--primary)] disabled:opacity-50"
                                  >
                                    {entrySaving
                                      ? "Salvando..."
                                      : "Salvar"}
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-xl border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--text-secondary)]"
              >
                {viewOnly ? "Fechar" : "Cancelar"}
              </button>

              {!viewOnly && (
                <button
                  type="button"
                  disabled={saving || confirmChecking}
                  onClick={() => void openCreateConfirm()}
                  className="rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] disabled:opacity-60"
                >
                  {saving
                    ? "Salvando..."
                    : confirmChecking
                      ? "Verificando..."
                      : editingId
                        ? "Salvar alterações"
                        : "Cadastrar"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmar cadastro da venda: checagem de saldo disponível */}
      {confirmCreateOpen && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-8 w-full max-w-xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                  Confirmar venda
                </h2>

                <p className="text-sm text-[var(--text-muted)]">
                  {form.partnerLabel}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setConfirmCreateOpen(false)}
                aria-label="Fechar"
                className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[var(--surface-hover)] text-[var(--text-secondary)]">
                    <tr>
                      <th className="px-4 py-2 font-semibold">
                        Produto
                      </th>
                      <th className="px-4 py-2 text-right font-semibold">
                        Necessário
                      </th>
                      <th className="px-4 py-2 text-right font-semibold">
                        Disponível
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {confirmItems.map((it) => {
                      const insuficiente =
                        it.available < it.needed;

                      return (
                        <tr
                          key={it.productId}
                          className="border-t border-[var(--border)]"
                        >
                          <td className="px-4 py-2 text-[var(--text-primary)]">
                            {it.description}
                          </td>

                          <td className="whitespace-nowrap px-4 py-2 text-right text-[var(--text-secondary)]">
                            {qty(it.needed)} {it.unit}
                          </td>

                          <td
                            className={`whitespace-nowrap px-4 py-2 text-right font-medium ${
                              insuficiente
                                ? "text-[var(--danger)]"
                                : "text-[var(--success)]"
                            }`}
                          >
                            {qty(it.available)} {it.unit}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
            </div>

            <div className="mt-4 rounded-xl border border-[var(--warning)] bg-[var(--warning-soft)] p-3 text-sm text-[var(--warning)]">
              Saldo disponível insuficiente para um ou mais
              itens. A aprovação da venda vai continuar
              bloqueada até regularizar o estoque — deseja
              registrar a venda mesmo assim?
            </div>

            {(confirmError || formError) && (
              <div className="mt-4 rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                {confirmError || formError}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() =>
                  setConfirmCreateOpen(false)
                }
                className="rounded-xl border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--text-secondary)]"
              >
                Não
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={() => void confirmCreate()}
                className="rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] disabled:opacity-60"
              >
                {saving ? "Salvando..." : "Sim, confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Aprovar venda: dados fiscais da nota */}
      {approveTarget && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-8 w-full max-w-3xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                  Aprovar venda{" "}
                  {formatSaleNumber(approveTarget.number)}
                </h2>

                <p className="text-sm text-[var(--text-muted)]">
                  {approveTarget.partner?.tradeName ??
                    approveTarget.partner?.legalName}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setApproveTarget(null)}
                aria-label="Fechar"
                className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-[var(--text-muted)]">
                Dados da nota fiscal de venda (opcional) — ficam
                registrados na venda e no título gerado em Contas a
                receber.
              </p>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className={labelClass}>
                    Nº da nota fiscal
                  </label>

                  <input
                    className={fieldClass}
                    value={approveForm.invoiceNumber}
                    onChange={(e) =>
                      setApproveForm({
                        ...approveForm,
                        invoiceNumber: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Chave de acesso (NF-e)
                  </label>

                  <input
                    maxLength={44}
                    inputMode="numeric"
                    placeholder="44 dígitos"
                    className={fieldClass}
                    value={approveForm.invoiceKey}
                    onChange={(e) =>
                      setApproveForm({
                        ...approveForm,
                        invoiceKey: e.target.value,
                        // Chave de acesso só existe em NF-e — sugere
                        // o tipo automaticamente se ainda não escolhido.
                        documentType:
                          e.target.value &&
                          !approveForm.documentType
                            ? "NOTA_FISCAL"
                            : approveForm.documentType,
                      })
                    }
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Data de emissão
                  </label>

                  <input
                    type="date"
                    className={fieldClass}
                    value={approveForm.invoiceIssueDate}
                    onChange={(e) =>
                      setApproveForm({
                        ...approveForm,
                        invoiceIssueDate: e.target.value,
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
                    value={approveForm.documentType}
                    onChange={(e) =>
                      setApproveForm({
                        ...approveForm,
                        documentType: e.target
                          .value as FinancialDocumentType | "",
                      })
                    }
                  >
                    <option value="">Selecione...</option>

                    {Object.entries(DOCUMENT_TYPE_LABELS).map(
                      ([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              <p className="text-xs text-[var(--text-muted)]">
                Dados financeiros do título gerado em Contas a
                receber — já vêm do lançamento da venda, mas pode
                corrigir aqui com o que estiver na nota.
              </p>

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
                    value={approveForm.termDays}
                    onChange={(e) =>
                      setApproveForm({
                        ...approveForm,
                        termDays: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Vencimento (calculado)
                  </label>

                  <div
                    className={`${fieldClass} flex items-center text-[var(--text-secondary)]`}
                  >
                    {date(
                      calculateDueDatePreview(
                        approveForm.invoiceIssueDate ||
                          approveTarget.saleDate?.slice(
                            0,
                            10
                          ) ||
                          undefined,
                        Number(approveForm.termDays) || 0
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
                    value={approveForm.paymentMethod}
                    onChange={(e) =>
                      setApproveForm({
                        ...approveForm,
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

              {approveError && (
                <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                  {approveError}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setApproveTarget(null)}
                  className="rounded-xl border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--text-secondary)]"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={actionId === approveTarget.id}
                  onClick={() => void confirmApprove()}
                  className="rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] disabled:opacity-60"
                >
                  {actionId === approveTarget.id
                    ? "Aprovando..."
                    : "Aprovar venda"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
