"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Ban,
  Download,
  Edit,
  Eye,
  FileText,
  Play,
  Plus,
  Send,
  Trash2,
  Undo2,
  X,
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
  SERVICE_ORDER_STATUS_LABELS,
  serviceOrderService,
  type ServiceOrder,
  type ServiceOrderStatus,
} from "@/services/service-order.service";

import { quoteService, type Quote } from "@/services/quote.service";

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
  return `OS-${String(n).padStart(6, "0")}`;
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

const STATUS_BADGE_CLASS: Record<ServiceOrderStatus, string> = {
  DRAFT: "bg-[var(--surface-hover)] text-[var(--text-secondary)]",
  IN_PROGRESS: "bg-[var(--warning-soft)] text-[var(--warning)]",
  AWAITING_CONFIRMATION: "bg-[var(--warning-soft)] text-[var(--warning)]",
  REVISION_REQUESTED: "bg-[var(--danger-soft)] text-[var(--danger)]",
  CONFIRMED: "bg-[var(--success-soft)] text-[var(--success)]",
  CONVERTED: "bg-[var(--success-soft)] text-[var(--success)]",
  CANCELLED: "bg-[var(--danger-soft)] text-[var(--danger)]",
};

interface ItemForm {
  productId: string;
  productLabel: string;
  description: string;
  quantity: string;
  unitPrice: number;
}

function emptyItem(): ItemForm {
  return {
    productId: "",
    productLabel: "",
    description: "",
    quantity: "",
    unitPrice: 0,
  };
}

function emptyForm() {
  return {
    partnerId: "",
    partnerLabel: "",
    warehouseId: "",
    description: "",
    scheduledStart: "",
    scheduledEnd: "",
    observation: "",
    discountValue: 0,
    freightValue: 0,
    otherExpenses: 0,
    chartOfAccountId: "",
    chartOfAccountLabel: "",
    termDays: "",
    paymentMethod: "" as PaymentMethod | "",
    installmentsCount: "",
    quoteId: "",
  };
}

export default function OrdensDeServicoPage() {
  const exportTableRef = useRef<HTMLTableElement>(null);
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  const [statusFilter, setStatusFilter] = useState("");

  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [viewOnly, setViewOnly] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [serviceItems, setServiceItems] = useState<ItemForm[]>([
    emptyItem(),
  ]);
  const [productItems, setProductItems] = useState<ItemForm[]>([]);
  const [installments, setInstallments] = useState<InstallmentRow[]>([
    { days: "", dueDate: "", amount: 0 },
  ]);

  const [detail, setDetail] = useState<ServiceOrder | null>(null);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [actionId, setActionId] = useState("");
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    warehouseService
      .list()
      .then(setWarehouses)
      .catch(() => {
        setListError("Não foi possível carregar os depósitos.");
      });
  }, []);

  const searchCustomers = useCallback(async (query: string) => {
    const result = await partnerService.list({
      role: "CUSTOMER",
      search: query || undefined,
      limit: 20,
    });

    return result.data;
  }, []);

  const searchProducts = useCallback(async (query: string) => {
    const result = await productService.list({
      search: query || undefined,
      limit: 20,
    });

    return result.data;
  }, []);

  const searchChartOfAccounts = useCallback(async (query: string) => {
    const result = await chartOfAccountService.list({
      search: query || undefined,
      limit: 200,
    });

    return result.data;
  }, []);

  const searchQuotes = useCallback(async (query: string) => {
    // Só orçamento PARA ORDEM DE SERVIÇO já aprovado — orçamento de
    // venda gera o Pedido sozinho na aprovação, não pode também virar
    // OS (duplicaria o Pedido).
    const result = await quoteService.list({
      status: "APPROVED",
      purpose: "SERVICE",
    });
    const q = query.trim().toLowerCase();

    return result
      .filter((quote) => {
        if (!q) {
          return true;
        }

        const orderNumber = `orc-${String(quote.number).padStart(6, "0")}`;
        const partnerName = (
          quote.partner?.tradeName ??
          quote.partner?.legalName ??
          ""
        ).toLowerCase();

        return (
          orderNumber.includes(q) ||
          String(quote.number).includes(q) ||
          partnerName.includes(q)
        );
      })
      .slice(0, 20);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setListError("");

    try {
      const result = await serviceOrderService.list({
        status: (statusFilter || undefined) as
          | ServiceOrderStatus
          | undefined,
      });

      setOrders(result);
    } catch (err) {
      setListError(
        extractMessage(
          err,
          "Não foi possível carregar as ordens de serviço."
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
    setServiceItems([emptyItem()]);
    setProductItems([]);
    setInstallments([{ days: "", dueDate: "", amount: 0 }]);
    setFormError("");
    setFormOpen(true);
  }

  function itemFromApi(it: {
    productId: string;
    description?: string | null;
    quantity: string | number;
    unitPrice: string | number;
    product?: { code: string; description: string } | null;
  }): ItemForm {
    return {
      productId: it.productId,
      productLabel: it.product
        ? `${it.product.code} — ${it.product.description}`
        : "",
      description: it.description ?? "",
      quantity: String(num(it.quantity)),
      unitPrice: num(it.unitPrice),
    };
  }

  function populateOrderForm(order: ServiceOrder) {
    setForm({
      partnerId: order.partnerId,
      partnerLabel:
        order.partner?.tradeName ?? order.partner?.legalName ?? "",
      warehouseId: order.warehouseId,
      description: order.description,
      scheduledStart: order.scheduledStart
        ? order.scheduledStart.slice(0, 10)
        : "",
      scheduledEnd: order.scheduledEnd
        ? order.scheduledEnd.slice(0, 10)
        : "",
      observation: order.observation ?? "",
      discountValue: num(order.discountValue),
      freightValue: num(order.freightValue),
      otherExpenses: num(order.otherExpenses),
      chartOfAccountId: order.chartOfAccountId ?? "",
      chartOfAccountLabel: order.chartOfAccount
        ? `${order.chartOfAccount.code} — ${order.chartOfAccount.description}`
        : "",
      termDays: order.termDays != null ? String(order.termDays) : "",
      paymentMethod: order.paymentMethod ?? "",
      installmentsCount:
        order.installmentsCount != null && order.installmentsCount > 1
          ? String(order.installmentsCount)
          : "",
      quoteId: order.quoteId ?? "",
    });
    setServiceItems(
      order.serviceItems.length
        ? order.serviceItems.map(itemFromApi)
        : [emptyItem()]
    );
    setProductItems(order.productItems.map(itemFromApi));

    const baseDateStr = order.scheduledStart
      ? order.scheduledStart.slice(0, 10)
      : todayIso();
    const orderNetTotal = num(order.netAmount);

    if (order.plannedInstallments?.length) {
      setInstallments(
        order.plannedInstallments.map((row) => ({
          days: daysBetween(baseDateStr, toDateInput(row.dueDate)),
          dueDate: toDateInput(row.dueDate),
          amount: row.amount,
        }))
      );
    } else {
      const count =
        order.installmentsCount && order.installmentsCount > 1
          ? order.installmentsCount
          : 1;

      setInstallments(
        buildInstallmentRows(
          baseDateStr,
          order.termDays ?? 0,
          count,
          orderNetTotal
        )
      );
    }
  }

  function openEdit(order: ServiceOrder) {
    setEditingId(order.id);
    setViewOnly(false);
    setDetail(order);
    populateOrderForm(order);
    setFormError("");
    setFormOpen(true);
  }

  function openView(order: ServiceOrder) {
    setEditingId(order.id);
    setViewOnly(true);
    setDetail(order);
    populateOrderForm(order);
    setFormError("");
    setFormOpen(true);
  }

  function importFromQuote(quote: Quote) {
    setForm((prev) => ({
      ...prev,
      partnerId: quote.partnerId,
      partnerLabel:
        quote.partner?.tradeName ?? quote.partner?.legalName ?? "",
      description: quote.serviceDescription || prev.description,
      chartOfAccountId: quote.chartOfAccountId ?? prev.chartOfAccountId,
      chartOfAccountLabel: quote.chartOfAccount
        ? `${quote.chartOfAccount.code} — ${quote.chartOfAccount.description}`
        : prev.chartOfAccountLabel,
      termDays:
        quote.termDays != null ? String(quote.termDays) : prev.termDays,
      paymentMethod: quote.paymentMethod ?? prev.paymentMethod,
      installmentsCount: quote.installmentsCount
        ? String(quote.installmentsCount)
        : prev.installmentsCount,
      quoteId: quote.id,
    }));

    // Cliente já aprovou prazo/parcelas lá no orçamento — só falta
    // preencher as datas de previsão do serviço, não repetir esse
    // trabalho aqui.
    if (quote.plannedInstallments && quote.plannedInstallments.length > 0) {
      setInstallments(
        quote.plannedInstallments.map((row) => ({
          days: "",
          dueDate: row.dueDate.slice(0, 10),
          amount: num(row.amount),
        }))
      );
    }

    const mapQuoteItem = (it: (typeof quote.items)[number]) => ({
      productId: it.productId,
      productLabel: it.product
        ? `${it.product.code} — ${it.product.description}`
        : "",
      description: it.description ?? "",
      quantity: String(num(it.quantity)),
      unitPrice: num(it.unitPrice),
    });

    const serviceRows = quote.items
      .filter((it) => it.itemKind === "SERVICE")
      .map(mapQuoteItem);
    const productRows = quote.items
      .filter((it) => it.itemKind !== "SERVICE")
      .map(mapQuoteItem);

    if (serviceRows.length) {
      setServiceItems(serviceRows);
    }
    setProductItems(productRows.length ? productRows : []);
  }

  const decimal = (value: string) => {
    const normalized = value.replace(/\./g, "").replace(",", ".");
    const parsed = Number(normalized);

    return Number.isFinite(parsed) ? parsed : 0;
  };

  function updateServiceItem(index: number, patch: Partial<ItemForm>) {
    setServiceItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, ...patch } : it))
    );
  }

  function updateProductItem(index: number, patch: Partial<ItemForm>) {
    setProductItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, ...patch } : it))
    );
  }

  function updateInstallment(index: number, patch: Partial<InstallmentRow>) {
    setInstallments((prev) =>
      prev.map((row, i) => {
        if (i !== index) {
          return row;
        }

        const next = { ...row, ...patch };

        if (patch.days !== undefined && patch.days !== "") {
          next.dueDate = recalcDueDateFromDays(
            form.scheduledStart || undefined,
            patch.days
          );
        }

        return next;
      })
    );
  }

  function addInstallment() {
    setInstallments((prev) => [...prev, { days: "", dueDate: "", amount: 0 }]);
  }

  function removeInstallment(index: number) {
    setInstallments((prev) => prev.filter((_, i) => i !== index));
  }

  const serviceItemsTotal = serviceItems.reduce(
    (sum, it) => sum + decimal(it.quantity) * it.unitPrice,
    0
  );
  const productItemsTotal = productItems.reduce(
    (sum, it) => sum + decimal(it.quantity) * it.unitPrice,
    0
  );
  const itemsTotal = serviceItemsTotal + productItemsTotal;

  const netTotal =
    itemsTotal - form.discountValue + form.freightValue + form.otherExpenses;

  async function saveForm() {
    if (!form.partnerId || !form.warehouseId) {
      setFormError("Selecione o cliente e o depósito.");

      return;
    }

    if (!form.description.trim()) {
      setFormError("Descreva o escopo do serviço.");

      return;
    }

    const validServiceItems = serviceItems.filter(
      (it) => it.productId && decimal(it.quantity) > 0
    );
    const validProductItems = productItems.filter(
      (it) => it.productId && decimal(it.quantity) > 0
    );

    if (validServiceItems.length === 0 && validProductItems.length === 0) {
      setFormError(
        "Adicione ao menos um serviço realizado ou produto usado."
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

    const validItemsTotal =
      validServiceItems.reduce(
        (sum, it) => sum + decimal(it.quantity) * it.unitPrice,
        0
      ) +
      validProductItems.reduce(
        (sum, it) => sum + decimal(it.quantity) * it.unitPrice,
        0
      );
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
      const sum = finalInstallments.reduce((acc, row) => acc + row.amount, 0);

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
      description: form.description,
      scheduledStart: form.scheduledStart || undefined,
      scheduledEnd: form.scheduledEnd || undefined,
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
      installments: finalInstallments,
      quoteId: form.quoteId || undefined,
      serviceItems: validServiceItems.map((it) => ({
        productId: it.productId,
        description: it.description || undefined,
        quantity: decimal(it.quantity),
        unitPrice: it.unitPrice,
      })),
      productItems: validProductItems.map((it) => ({
        productId: it.productId,
        quantity: decimal(it.quantity),
        unitPrice: it.unitPrice,
      })),
    };

    try {
      if (editingId) {
        await serviceOrderService.update(editingId, payload);
      } else {
        await serviceOrderService.create(payload);
      }

      setFormOpen(false);

      await load();
    } catch (err) {
      setFormError(
        extractMessage(err, "Não foi possível salvar a ordem de serviço.")
      );
    } finally {
      setSaving(false);
    }
  }

  async function startExecutionOrder(id: string) {
    setActionId(id);
    setActionError("");

    try {
      await serviceOrderService.startExecution(id);

      await load();
    } catch (err) {
      setActionError(
        extractMessage(err, "Não foi possível iniciar a execução.")
      );
    } finally {
      setActionId("");
    }
  }

  async function undoStartExecutionOrder(id: string) {
    if (
      !window.confirm(
        "Estornar o início da execução? A ordem volta para rascunho."
      )
    ) {
      return;
    }

    setActionId(id);
    setActionError("");

    try {
      await serviceOrderService.undoStartExecution(id);

      await load();
    } catch (err) {
      setActionError(
        extractMessage(err, "Não foi possível estornar o início da execução.")
      );
    } finally {
      setActionId("");
    }
  }

  async function completeOrder(id: string) {
    if (
      !window.confirm(
        "Finalizar o serviço? Isso gera o Pedido de Venda e avisa o cliente por e-mail/WhatsApp que já pode retirar."
      )
    ) {
      return;
    }

    setActionId(id);
    setActionError("");

    try {
      await serviceOrderService.complete(id);

      await load();
    } catch (err) {
      setActionError(
        extractMessage(err, "Não foi possível finalizar o serviço.")
      );
    } finally {
      setActionId("");
    }
  }

  async function undoCompleteOrder(id: string) {
    if (
      !window.confirm(
        "Estornar a finalização do serviço? Cancela o Pedido de Venda gerado e a ordem volta para execução."
      )
    ) {
      return;
    }

    setActionId(id);
    setActionError("");

    try {
      await serviceOrderService.undoComplete(id);

      await load();
    } catch (err) {
      setActionError(
        extractMessage(err, "Não foi possível estornar a finalização.")
      );
    } finally {
      setActionId("");
    }
  }

  async function sendConfirmationOrder(id: string) {
    setActionId(id);
    setActionError("");

    try {
      await serviceOrderService.sendConfirmation(id);

      await load();
    } catch (err) {
      setActionError(
        extractMessage(err, "Não foi possível enviar a confirmação.")
      );
    } finally {
      setActionId("");
    }
  }

  async function cancelOrder(id: string) {
    if (!window.confirm("Cancelar esta ordem de serviço?")) {
      return;
    }

    setActionId(id);
    setActionError("");

    try {
      await serviceOrderService.cancel(id);

      await load();
    } catch (err) {
      setActionError(
        extractMessage(err, "Não foi possível cancelar a ordem de serviço.")
      );
    } finally {
      setActionId("");
    }
  }

  async function removeOrder(id: string) {
    if (
      !window.confirm(
        "Excluir esta ordem de serviço cancelada? Não tem como desfazer."
      )
    ) {
      return;
    }

    setActionId(id);
    setActionError("");

    try {
      await serviceOrderService.remove(id);

      await load();
    } catch (err) {
      setActionError(
        extractMessage(err, "Não foi possível excluir a ordem de serviço.")
      );
    } finally {
      setActionId("");
    }
  }

  function downloadPdf(id: string) {
    window.open(serviceOrderService.pdfUrl(id), "_blank");
  }

  function renderItemsGroup(
    title: string,
    itemsArr: ItemForm[],
    setItemsArr: React.Dispatch<React.SetStateAction<ItemForm[]>>,
    update: (index: number, patch: Partial<ItemForm>) => void,
    showDescription: boolean
  ) {
    return (
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className={labelClass}>{title}</label>

          <button
            type="button"
            onClick={() => setItemsArr((prev) => [...prev, emptyItem()])}
            className="flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
          >
            <Plus size={14} />
            Adicionar item
          </button>
        </div>

        {itemsArr.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--border)] p-3 text-center text-xs text-[var(--text-muted)]">
            Nenhum item.
          </p>
        ) : (
          <div className="space-y-2">
            {itemsArr.map((it, index) => {
              const subtotal = decimal(it.quantity) * it.unitPrice;

              return (
                <div
                  key={index}
                  className="rounded-xl border border-[var(--border)] p-2"
                >
                  <div className="grid grid-cols-12 items-start gap-2">
                    <div
                      className={
                        showDescription ? "col-span-3" : "col-span-5"
                      }
                    >
                      <SearchSelect<Product>
                        displayLabel={it.productLabel}
                        search={searchProducts}
                        getId={(p) => p.id}
                        getLabel={(p) => `${p.code} — ${p.description}`}
                        getSubLabel={(p) => money(p.salePrice)}
                        placeholder="Digite para buscar o produto..."
                        onSelect={(p) => {
                          update(index, {
                            productId: p?.id ?? "",
                            productLabel: p
                              ? `${p.code} — ${p.description}`
                              : "",
                            unitPrice:
                              p && !it.unitPrice
                                ? num(p.salePrice)
                                : it.unitPrice,
                          });

                          if (
                            p?.saleChartOfAccountId &&
                            !form.chartOfAccountId
                          ) {
                            setForm((prev) => ({
                              ...prev,
                              chartOfAccountId: p.saleChartOfAccountId!,
                              chartOfAccountLabel: p.saleChartOfAccount
                                ? `${p.saleChartOfAccount.code} — ${p.saleChartOfAccount.description}`
                                : prev.chartOfAccountLabel,
                            }));
                          }
                        }}
                      />
                    </div>

                    {showDescription && (
                      <input
                        placeholder="Detalhe do serviço (opcional)"
                        className={`${fieldClass} col-span-3`}
                        value={it.description}
                        onChange={(e) =>
                          update(index, { description: e.target.value })
                        }
                      />
                    )}

                    <input
                      inputMode="decimal"
                      placeholder="Qtd"
                      className={`${fieldClass} ${showDescription ? "col-span-1" : "col-span-2"}`}
                      value={it.quantity}
                      onChange={(e) =>
                        update(index, { quantity: e.target.value })
                      }
                    />

                    <CurrencyInput
                      placeholder="Preço unit."
                      wrapperClassName="col-span-2"
                      className={fieldClass}
                      value={it.unitPrice}
                      onChange={(value) => update(index, { unitPrice: value })}
                    />

                    <div className="col-span-2 whitespace-nowrap py-2.5 text-right text-sm font-medium text-[var(--text-primary)]">
                      {money(subtotal)}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setItemsArr((prev) =>
                          prev.filter((_, i) => i !== index)
                        )
                      }
                      title="Remover item"
                      aria-label="Remover item"
                      className="col-span-1 flex justify-center py-2 text-[var(--text-secondary)] transition-colors hover:text-[var(--danger)]"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const semDeposito = warehouses.length === 0;

  return (
    <AppShell workspaceLabel="Ordens de serviço">
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
                    Ordens de serviço
                  </h1>

                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    Prestação de serviço — separada em serviços
                    realizados e produtos/materiais usados. O cliente
                    pode aprovar o escopo antes da execução começar;
                    ao finalizar o serviço, vira Pedido de Venda e o
                    cliente é avisado que pode retirar.
                  </p>
                </div>

                <div className="flex gap-2">
                  <ExportButton
                    tableRef={exportTableRef}
                    filename="ordens-de-servico"
                    sheetName="Ordens de serviço"
                  />

                  <Can permission="service-order.create">
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
                      Nova ordem de serviço
                    </button>
                  </Can>
                </div>
              </div>
            </header>

            <div className="flex flex-wrap gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={`${fieldClass} max-w-64`}
              >
                <option value="">Todos os status</option>

                {Object.entries(SERVICE_ORDER_STATUS_LABELS).map(
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
        ) : orders.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-medium text-[var(--text-primary)]">
              Nenhuma ordem de serviço cadastrada
            </p>

            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Use &quot;Nova ordem de serviço&quot; para começar.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table ref={exportTableRef} className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-[var(--surface-hover)] text-[var(--text-secondary)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Número</th>
                  <th className="px-4 py-3 font-semibold">Data</th>
                  <th className="px-4 py-3 font-semibold">Cliente</th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Líquido
                  </th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>

              <tbody>
                {orders.map((o) => {
                  const busy = actionId === o.id;
                  const canEdit =
                    o.status === "DRAFT" ||
                    o.status === "IN_PROGRESS" ||
                    o.status === "REVISION_REQUESTED";
                  const canCancel =
                    o.status !== "CONFIRMED" &&
                    o.status !== "CONVERTED" &&
                    o.status !== "CANCELLED";

                  return (
                    <tr
                      key={o.id}
                      className="border-t border-[var(--border)]"
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-[var(--text-primary)]">
                        {formatNumber(o.number)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-[var(--text-secondary)]">
                        {date(o.createdAt)}
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
                          {SERVICE_ORDER_STATUS_LABELS[o.status]}
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

                          <button
                            type="button"
                            onClick={() => downloadPdf(o.id)}
                            title="Baixar PDF"
                            aria-label="Baixar PDF"
                            className="rounded-lg border border-[var(--border)] p-2 text-[var(--warning)] transition-colors hover:border-[var(--warning)] hover:bg-[var(--warning-soft)]"
                          >
                            <Download size={16} />
                          </button>

                          {canEdit && (
                            <Can permission="service-order.update">
                              <button
                                type="button"
                                onClick={() => openEdit(o)}
                                title="Editar"
                                aria-label="Editar"
                                className="rounded-lg border border-[var(--border)] p-2 text-[var(--primary)] transition-colors hover:border-[var(--primary)] hover:bg-[var(--primary-soft)]"
                              >
                                <Edit size={16} />
                              </button>
                            </Can>
                          )}

                          {o.status === "DRAFT" && (
                            <Can permission="service-order.update">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() =>
                                  void startExecutionOrder(o.id)
                                }
                                title="Iniciar execução"
                                aria-label="Iniciar execução"
                                className="rounded-lg border border-[var(--border)] p-2 text-[var(--success)] transition-colors hover:border-[var(--success)] hover:bg-[var(--success-soft)] disabled:opacity-50"
                              >
                                <Play size={16} />
                              </button>
                            </Can>
                          )}

                          {o.status === "IN_PROGRESS" && (
                            <Can permission="service-order.update">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() =>
                                  void undoStartExecutionOrder(o.id)
                                }
                                title="Estornar início de execução"
                                aria-label="Estornar início de execução"
                                className="rounded-lg border border-[var(--border)] p-2 text-[var(--accent-maroon)] transition-colors hover:border-[var(--accent-maroon)] hover:bg-[var(--accent-maroon-soft)] disabled:opacity-50"
                              >
                                <Undo2 size={16} />
                              </button>
                            </Can>
                          )}

                          {o.status === "IN_PROGRESS" && (
                            <Can permission="service-order.update">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void completeOrder(o.id)}
                                title="Finalizar serviço (gera o Pedido e avisa o cliente)"
                                aria-label="Finalizar serviço"
                                className="rounded-lg border border-[var(--border)] p-2 text-[var(--success)] transition-colors hover:border-[var(--success)] hover:bg-[var(--success-soft)] disabled:opacity-50"
                              >
                                <FileText size={16} />
                              </button>
                            </Can>
                          )}

                          {o.status === "CONFIRMED" && (
                            <Can permission="service-order.update">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void undoCompleteOrder(o.id)}
                                title="Estornar finalização (cancela o Pedido gerado)"
                                aria-label="Estornar finalização"
                                className="rounded-lg border border-[var(--border)] p-2 text-[var(--accent-maroon)] transition-colors hover:border-[var(--accent-maroon)] hover:bg-[var(--accent-maroon-soft)] disabled:opacity-50"
                              >
                                <Undo2 size={16} />
                              </button>
                            </Can>
                          )}

                          {(o.status === "DRAFT" ||
                            o.status === "REVISION_REQUESTED") && (
                            <Can permission="service-order.send-confirmation">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() =>
                                  void sendConfirmationOrder(o.id)
                                }
                                title="Enviar confirmação ao cliente"
                                aria-label="Enviar confirmação"
                                className="rounded-lg border border-[var(--border)] p-2 text-[var(--accent-orange)] transition-colors hover:border-[var(--accent-orange)] hover:bg-[var(--accent-orange-soft)] disabled:opacity-50"
                              >
                                <Send size={16} />
                              </button>
                            </Can>
                          )}

                          {canCancel && (
                            <Can permission="service-order.cancel">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void cancelOrder(o.id)}
                                title="Cancelar"
                                aria-label="Cancelar"
                                className="rounded-lg border border-[var(--border)] p-2 text-[var(--danger)] transition-colors hover:border-[var(--danger)] hover:bg-[var(--danger-soft)] disabled:opacity-50"
                              >
                                <Ban size={16} />
                              </button>
                            </Can>
                          )}

                          {o.status === "CANCELLED" && (
                            <Can permission="service-order.delete">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void removeOrder(o.id)}
                                title="Excluir"
                                aria-label="Excluir"
                                className="rounded-lg border border-[var(--border)] p-2 text-[var(--danger)] transition-colors hover:border-[var(--danger)] hover:bg-[var(--danger-soft)] disabled:opacity-50"
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

      {/* Nova/editar/consultar ordem de serviço */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-8 w-full max-w-5xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                  {viewOnly
                    ? "Consultar ordem de serviço"
                    : editingId
                      ? "Editar ordem de serviço"
                      : "Nova ordem de serviço"}
                </h2>

                {viewOnly && detail && (
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    {SERVICE_ORDER_STATUS_LABELS[detail.status]}
                  </p>
                )}

                {viewOnly &&
                  detail &&
                  (detail.createdByName || detail.updatedByName) && (
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      {[
                        detail.createdByName &&
                          `Criado por ${detail.createdByName} em ${date(detail.createdAt)}`,
                        detail.updatedByName &&
                          detail.updatedByName !== detail.createdByName &&
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

            {!viewOnly && !editingId && (
              <div className="mb-4 rounded-xl border border-dashed border-[var(--border)] p-3">
                <label className={labelClass}>
                  Gerar a partir de um orçamento de serviço aprovado
                  (opcional)
                </label>

                <SearchSelect<Quote>
                  displayLabel=""
                  search={searchQuotes}
                  getId={(q) => q.id}
                  getLabel={(q) =>
                    `ORC-${String(q.number).padStart(6, "0")} — ${q.partner?.tradeName ?? q.partner?.legalName ?? ""}`
                  }
                  getSubLabel={(q) => money(q.netAmount)}
                  placeholder="Digite o número ou o cliente do orçamento..."
                  onSelect={(q) => {
                    if (q) {
                      importFromQuote(q);
                    }
                  }}
                />

                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Copia cliente, escopo e itens (já separados em
                  Serviços/Produtos) do orçamento — o cliente já
                  autorizou por lá, então essa OS entra direto em
                  execução, sem precisar confirmar de novo.
                </p>
              </div>
            )}

            <fieldset disabled={viewOnly} className="contents">
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="sm:col-span-2 lg:col-span-1">
                    <label className={labelClass}>Cliente</label>

                    <SearchSelect<BusinessPartner>
                      displayLabel={form.partnerLabel}
                      search={searchCustomers}
                      getId={(p) => p.id}
                      getLabel={(p) => p.tradeName ?? p.legalName}
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
                    <label className={labelClass}>Depósito</label>

                    <select
                      className={fieldClass}
                      value={form.warehouseId}
                      onChange={(e) =>
                        setForm({ ...form, warehouseId: e.target.value })
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
                    <label className={labelClass}>Início previsto</label>

                    <input
                      type="date"
                      className={fieldClass}
                      value={form.scheduledStart}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          scheduledStart: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Fim previsto</label>

                    <input
                      type="date"
                      className={fieldClass}
                      value={form.scheduledEnd}
                      onChange={(e) =>
                        setForm({ ...form, scheduledEnd: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>
                    Descrição do serviço (escopo)
                  </label>

                  <textarea
                    rows={2}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                  />
                </div>

                {renderItemsGroup(
                  "Serviços Realizados",
                  serviceItems,
                  setServiceItems,
                  updateServiceItem,
                  true
                )}

                {renderItemsGroup(
                  "Produtos e Materiais Usados",
                  productItems,
                  setProductItems,
                  updateProductItem,
                  false
                )}

                <div>
                  <label className={labelClass}>Observação</label>

                  <input
                    className={fieldClass}
                    value={form.observation}
                    onChange={(e) =>
                      setForm({ ...form, observation: e.target.value })
                    }
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className={labelClass}>Desconto (R$)</label>

                    <CurrencyInput
                      className={fieldClass}
                      value={form.discountValue}
                      onChange={(value) =>
                        setForm({ ...form, discountValue: value })
                      }
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Frete (R$)</label>

                    <CurrencyInput
                      className={fieldClass}
                      value={form.freightValue}
                      onChange={(value) =>
                        setForm({ ...form, freightValue: value })
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
                        setForm({ ...form, otherExpenses: value })
                      }
                    />
                  </div>
                </div>

                <div className="flex flex-wrap justify-end gap-6 text-sm">
                  <span className="text-[var(--text-secondary)]">
                    Serviços: {money(serviceItemsTotal)}
                  </span>

                  <span className="text-[var(--text-secondary)]">
                    Produtos: {money(productItemsTotal)}
                  </span>

                  <span className="font-semibold text-[var(--text-primary)]">
                    Líquido: {money(netTotal)}
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-4">
                  <div>
                    <label className={labelClass}>Tipo de receita</label>

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

                  <div>
                    <label className={labelClass}>Prazo (dias)</label>

                    <input
                      type="number"
                      min={0}
                      className={fieldClass}
                      value={form.termDays}
                      onChange={(e) =>
                        setForm({ ...form, termDays: e.target.value })
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

                        setForm({ ...form, installmentsCount: value });

                        const count = Number(value) || 1;

                        setInstallments(
                          buildInstallmentRows(
                            form.scheduledStart || undefined,
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
                          paymentMethod: e.target.value as
                            | PaymentMethod
                            | "",
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

                <InstallmentsEditor
                  installments={installments}
                  onUpdate={updateInstallment}
                  onAdd={addInstallment}
                  onRemove={removeInstallment}
                  total={netTotal}
                  totalLabel="valor líquido"
                />

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
