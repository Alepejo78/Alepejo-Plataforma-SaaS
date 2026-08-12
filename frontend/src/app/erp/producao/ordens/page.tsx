"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Edit,
  Play,
  Plus,
  Settings,
  Undo2,
  X,
  XCircle,
} from "lucide-react";

import { AppShell } from "@/components";
import { Can } from "@/components/auth/Can";
import { ListPageLayout } from "@/components/layout/ListPageLayout";
import { SearchSelect } from "@/components/ui/SearchSelect";

import {
  PRODUCTION_ORDER_ORIGIN_LABELS,
  PRODUCTION_ORDER_STATUS_LABELS,
  formatProductionOrderNumber,
  productionOrderService,
  type ProductionOrder,
  type ProductionOrderStatus,
} from "@/services/production.service";

import {
  warehouseService,
  type Warehouse,
} from "@/services/inventory.service";

import {
  productService,
  type Product,
} from "@/services/product.service";

function num(value: string | number | null | undefined) {
  return Number(value ?? 0);
}

function qty(value: string | number | null | undefined) {
  return num(value).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
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

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
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

const readOnlyFieldClass = `
  h-11 w-full rounded-xl border border-[var(--border)]
  bg-[var(--surface-hover)] px-3 text-sm text-[var(--text-secondary)]
`;

const labelClass =
  "mb-1 block text-sm font-medium text-[var(--text-secondary)]";

const STATUS_BADGE_CLASS: Record<ProductionOrderStatus, string> = {
  AGUARDANDO_PRODUCAO:
    "bg-[var(--surface-hover)] text-[var(--text-secondary)]",
  EM_PRODUCAO: "bg-[var(--warning-soft)] text-[var(--warning)]",
  FINALIZADA: "bg-[var(--success-soft)] text-[var(--success)]",
  CANCELADA: "bg-[var(--danger-soft)] text-[var(--danger)]",
};

function isOverdue(order: ProductionOrder) {
  if (
    order.status === "FINALIZADA" ||
    order.status === "CANCELADA" ||
    !order.expectedDate
  ) {
    return false;
  }

  return order.expectedDate.slice(0, 10) < todayInputValue();
}

function statusDotClass(order: ProductionOrder) {
  if (isOverdue(order)) {
    return "bg-[var(--danger)]";
  }

  switch (order.status) {
    case "FINALIZADA":
      return "bg-[var(--success)]";
    case "CANCELADA":
      return "bg-[var(--danger)]";
    case "EM_PRODUCAO":
      return "bg-[var(--warning)]";
    default:
      return "bg-[var(--text-muted)]";
  }
}

function emptyForm() {
  return {
    productId: "",
    productLabel: "",
    warehouseId: "",
    quantity: "",
    productionDays: "",
    observation: "",
  };
}

function emptyCompleteForm() {
  return {
    completedAt: todayInputValue(),
    observation: "",
  };
}

export default function OrdensDeProducaoPage() {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  const [statusFilter, setStatusFilter] = useState("");

  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] =
    useState<ProductionOrder | null>(null);
  const [form, setForm] = useState(emptyForm());

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [completeOrder, setCompleteOrder] =
    useState<ProductionOrder | null>(null);
  const [completeForm, setCompleteForm] = useState(
    emptyCompleteForm()
  );
  const [completing, setCompleting] = useState(false);
  const [completeError, setCompleteError] = useState("");

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

  const searchProducts = useCallback(async (query: string) => {
    const result = await productService.list({
      search: query || undefined,
      limit: 20,
    });

    return result.data;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setListError("");

    try {
      const result = await productionOrderService.list({
        status: (statusFilter || undefined) as
          | ProductionOrderStatus
          | undefined,
      });

      setOrders(result);
    } catch (err) {
      setListError(
        extractMessage(
          err,
          "Não foi possível carregar as ordens de produção."
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
    setEditingOrder(null);
    setForm({
      ...emptyForm(),
      warehouseId: warehouses[0]?.id ?? "",
    });
    setFormError("");
    setFormOpen(true);
  }

  function openEdit(order: ProductionOrder) {
    setEditingOrder(order);
    setForm({
      productId: order.productId,
      productLabel: order.product
        ? `${order.product.code} — ${order.product.description}`
        : "",
      warehouseId: order.warehouseId,
      quantity: String(num(order.quantity)),
      productionDays: String(order.productionDays),
      observation: order.observation ?? "",
    });
    setFormError("");
    setFormOpen(true);
  }

  const decimal = (value: string) => {
    const normalized = value.replace(/\./g, "").replace(",", ".");
    const parsed = Number(normalized);

    return Number.isFinite(parsed) ? parsed : 0;
  };

  async function saveForm() {
    if (!form.productId || !form.warehouseId) {
      setFormError("Selecione o produto e o depósito.");

      return;
    }

    const quantity = decimal(form.quantity);

    if (quantity <= 0) {
      setFormError("Informe uma quantidade maior que zero.");

      return;
    }

    const productionDays = Number(form.productionDays);

    if (!Number.isFinite(productionDays) || productionDays < 1) {
      setFormError(
        "Informe os dias de produção (mínimo 1 dia)."
      );

      return;
    }

    setSaving(true);
    setFormError("");

    const payload = {
      productId: form.productId,
      warehouseId: form.warehouseId,
      quantity,
      productionDays,
      observation: form.observation || undefined,
    };

    try {
      if (editingOrder) {
        await productionOrderService.update(
          editingOrder.id,
          payload
        );
      } else {
        await productionOrderService.create(payload);
      }

      setFormOpen(false);

      await load();
    } catch (err) {
      setFormError(
        extractMessage(
          err,
          "Não foi possível salvar a ordem de produção."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  async function runAction(
    id: string,
    action: (id: string) => Promise<unknown>,
    fallbackMessage: string
  ) {
    setActionId(id);
    setActionError("");

    try {
      await action(id);

      await load();
    } catch (err) {
      setActionError(extractMessage(err, fallbackMessage));
    } finally {
      setActionId("");
    }
  }

  function openComplete(order: ProductionOrder) {
    setCompleteOrder(order);
    setCompleteForm(emptyCompleteForm());
    setCompleteError("");
  }

  async function confirmComplete() {
    if (!completeOrder) {
      return;
    }

    if (!completeForm.completedAt) {
      setCompleteError("Informe a data de término.");

      return;
    }

    setCompleting(true);
    setCompleteError("");

    try {
      await productionOrderService.complete(completeOrder.id, {
        completedAt: completeForm.completedAt,
        observation: completeForm.observation || undefined,
      });

      setCompleteOrder(null);

      await load();
    } catch (err) {
      setCompleteError(
        extractMessage(
          err,
          "Não foi possível concluir a ordem de produção."
        )
      );
    } finally {
      setCompleting(false);
    }
  }

  const semDeposito = warehouses.length === 0;

  return (
    <AppShell workspaceLabel="Ordens de produção">
      <ListPageLayout
        header={
          <>
            <header>
              <Link
                href="/erp/producao/configuracoes"
                className="mb-3 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              >
                <ArrowLeft size={16} />
                Configurações de produção
              </Link>

              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                    Ordens de produção
                  </h1>

                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    Manuais ou geradas sozinhas (pedido de venda
                    maior que o saldo, ou estoque no mínimo).
                    Concluir gera entrada de estoque.
                  </p>
                </div>

                <div className="flex gap-2">
                  <Link
                    href="/erp/producao/acompanhamento"
                    className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                  >
                    Acompanhamento
                  </Link>

                  <Link
                    href="/erp/producao/configuracoes"
                    className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                  >
                    <Settings size={18} />
                    Configurações
                  </Link>

                  <Can permission="production-order.create">
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
                      Nova ordem
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

                {Object.entries(PRODUCTION_ORDER_STATUS_LABELS).map(
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
              Nenhuma ordem de produção cadastrada
            </p>

            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Use &quot;Nova ordem&quot; para começar.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-[var(--surface-hover)] text-[var(--text-secondary)]">
                <tr>
                  <th className="px-4 py-3" />
                  <th className="px-4 py-3 font-semibold">
                    Número
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Produto
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Qtd
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Depósito
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Origem
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Data de produção
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Dias
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Previsão
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
                      <td className="px-4 py-3">
                        <span
                          title={
                            isOverdue(o)
                              ? "Atrasada"
                              : PRODUCTION_ORDER_STATUS_LABELS[
                                  o.status
                                ]
                          }
                          className={`inline-block h-2.5 w-2.5 rounded-full ${statusDotClass(o)}`}
                        />
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 font-medium text-[var(--text-primary)]">
                        {formatProductionOrderNumber(o.number)}
                      </td>

                      <td className="px-4 py-3">
                        <p className="font-medium text-[var(--text-primary)]">
                          {o.product?.description ?? "—"}
                        </p>

                        <p className="text-xs text-[var(--text-muted)]">
                          {o.product?.code}
                        </p>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-right text-[var(--text-secondary)]">
                        {qty(o.quantity)}{" "}
                        {o.product?.unit?.code ?? ""}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-[var(--text-secondary)]">
                        {o.warehouse?.code ?? "—"}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-[var(--text-secondary)]">
                        {PRODUCTION_ORDER_ORIGIN_LABELS[o.origin]}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-[var(--text-secondary)]">
                        {date(o.orderDate)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-right text-[var(--text-secondary)]">
                        {o.productionDays}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-[var(--text-secondary)]">
                        {date(o.expectedDate)}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE_CLASS[o.status]}`}
                        >
                          {PRODUCTION_ORDER_STATUS_LABELS[o.status]}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {o.status === "AGUARDANDO_PRODUCAO" && (
                            <>
                              <Can permission="production-order.update">
                                <button
                                  type="button"
                                  onClick={() => openEdit(o)}
                                  title="Editar"
                                  aria-label="Editar"
                                  className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]"
                                >
                                  <Edit size={16} />
                                </button>
                              </Can>

                              <Can permission="production-order.update">
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() =>
                                    void runAction(
                                      o.id,
                                      (id) =>
                                        productionOrderService.start(
                                          id
                                        ),
                                      "Não foi possível iniciar a produção."
                                    )
                                  }
                                  title="Iniciar produção"
                                  aria-label="Iniciar produção"
                                  className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--warning)] hover:text-[var(--warning)] disabled:opacity-50"
                                >
                                  <Play size={16} />
                                </button>
                              </Can>

                              <Can permission="production-order.cancel">
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() =>
                                    void runAction(
                                      o.id,
                                      (id) =>
                                        productionOrderService.cancel(
                                          id
                                        ),
                                      "Não foi possível cancelar a ordem de produção."
                                    )
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

                          {o.status === "EM_PRODUCAO" && (
                            <>
                              <Can permission="production-order.complete">
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => openComplete(o)}
                                  title="Concluir produção (gera entrada de estoque)"
                                  aria-label="Concluir produção"
                                  className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-2 py-2 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--success)] hover:text-[var(--success)] disabled:opacity-50"
                                >
                                  <CheckCircle2 size={16} />
                                  Concluir
                                </button>
                              </Can>

                              <Can permission="production-order.cancel">
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() =>
                                    void runAction(
                                      o.id,
                                      (id) =>
                                        productionOrderService.cancel(
                                          id
                                        ),
                                      "Não foi possível cancelar a ordem de produção."
                                    )
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

                          {o.status === "FINALIZADA" && (
                            <Can permission="production-order.complete">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() =>
                                  void runAction(
                                    o.id,
                                    (id) =>
                                      productionOrderService.undoComplete(
                                        id
                                      ),
                                    "Não foi possível estornar a conclusão."
                                  )
                                }
                                title="Estornar conclusão"
                                aria-label="Estornar conclusão"
                                className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-2 py-2 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] disabled:opacity-50"
                              >
                                <Undo2 size={16} />
                                Estornar
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

      {/* Nova/editar ordem */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-8 w-full max-w-4xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                {editingOrder
                  ? "Editar ordem de produção"
                  : "Nova ordem de produção"}
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

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="sm:col-span-2">
                  <label className={labelClass}>Produto</label>

                  <SearchSelect<Product>
                    displayLabel={form.productLabel}
                    search={searchProducts}
                    getId={(p) => p.id}
                    getLabel={(p) =>
                      `${p.code} — ${p.description}`
                    }
                    placeholder="Digite para buscar o produto..."
                    onSelect={(p) =>
                      setForm({
                        ...form,
                        productId: p?.id ?? "",
                        productLabel: p
                          ? `${p.code} — ${p.description}`
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
                    Quantidade
                  </label>

                  <input
                    inputMode="decimal"
                    placeholder="0"
                    className={fieldClass}
                    value={form.quantity}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        quantity: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Dias de produção
                  </label>

                  <input
                    inputMode="numeric"
                    placeholder="Ex.: 10"
                    className={fieldClass}
                    value={form.productionDays}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        productionDays: e.target.value,
                      })
                    }
                  />
                </div>

                {editingOrder && (
                  <>
                    <div>
                      <label className={labelClass}>
                        Data de produção
                      </label>

                      <input
                        disabled
                        className={readOnlyFieldClass}
                        value={date(editingOrder.orderDate)}
                      />
                    </div>

                    <div>
                      <label className={labelClass}>
                        Previsão
                      </label>

                      <input
                        disabled
                        title="Recalculada ao salvar, a partir da data de produção + dias de produção"
                        className={readOnlyFieldClass}
                        value={date(editingOrder.expectedDate)}
                      />
                    </div>
                  </>
                )}

                <div className="sm:col-span-2 lg:col-span-4">
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

              {formError && (
                <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                  {formError}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="rounded-xl border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--text-secondary)]"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void saveForm()}
                  className="rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] disabled:opacity-60"
                >
                  {saving ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Concluir produção */}
      {completeOrder && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-8 w-full max-w-lg rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                Concluir{" "}
                {formatProductionOrderNumber(
                  completeOrder.number
                )}
              </h2>

              <button
                type="button"
                onClick={() => setCompleteOrder(null)}
                aria-label="Fechar"
                className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className={labelClass}>
                  Data de término
                </label>

                <input
                  type="date"
                  className={fieldClass}
                  value={completeForm.completedAt}
                  onChange={(e) =>
                    setCompleteForm({
                      ...completeForm,
                      completedAt: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className={labelClass}>Observação</label>

                <input
                  className={fieldClass}
                  value={completeForm.observation}
                  onChange={(e) =>
                    setCompleteForm({
                      ...completeForm,
                      observation: e.target.value,
                    })
                  }
                />
              </div>

              {completeError && (
                <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                  {completeError}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCompleteOrder(null)}
                  className="rounded-xl border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--text-secondary)]"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={completing}
                  onClick={() => void confirmComplete()}
                  className="rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] disabled:opacity-60"
                >
                  {completing ? "Concluindo..." : "Concluir"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
