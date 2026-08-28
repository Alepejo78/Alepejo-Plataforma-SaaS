"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Eye,
  Plus,
  Trash2,
  X,
  XCircle,
} from "lucide-react";

import { AppShell } from "@/components";
import { Can } from "@/components/auth/Can";
import { ListPageLayout } from "@/components/layout/ListPageLayout";
import { SearchSelect } from "@/components/ui/SearchSelect";

import {
  INVENTORY_COUNT_STATUS_LABELS,
  formatInventoryCountNumber,
  inventoryCountService,
  type InventoryCount,
  type InventoryCountStatus,
} from "@/services/inventory-count.service";

import {
  inventoryService,
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

const STATUS_BADGE_CLASS: Record<InventoryCountStatus, string> = {
  DRAFT: "bg-[var(--warning-soft)] text-[var(--warning)]",
  FINALIZED: "bg-[var(--success-soft)] text-[var(--success)]",
  CANCELLED: "bg-[var(--danger-soft)] text-[var(--danger)]",
};

type Scope = "GENERAL" | "SELECTED";

interface ItemForm {
  productId: string;
  productLabel: string;
  countedQuantity: string;
  /** undefined = ainda não tem preview do saldo (produto novo, sem depósito escolhido). */
  systemQuantity?: number;
  reservedQuantity?: number;
}

function emptyItem(): ItemForm {
  return {
    productId: "",
    productLabel: "",
    countedQuantity: "",
  };
}

function emptyForm() {
  return {
    warehouseId: "",
    countDate: todayIso(),
    observation: "",
  };
}

export default function InventarioPage() {
  const [counts, setCounts] = useState<InventoryCount[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  const [statusFilter, setStatusFilter] = useState("");

  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewOnly, setViewOnly] = useState(false);
  const [detail, setDetail] = useState<InventoryCount | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [scope, setScope] = useState<Scope>("SELECTED");
  const [items, setItems] = useState<ItemForm[]>([emptyItem()]);
  const [loadingGeneral, setLoadingGeneral] = useState(false);

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
      const result = await inventoryCountService.list({
        status: (statusFilter || undefined) as
          | InventoryCountStatus
          | undefined,
      });

      setCounts(result);
    } catch (err) {
      setListError(
        extractMessage(
          err,
          "Não foi possível carregar as contagens de inventário."
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
    setForm({ ...emptyForm(), warehouseId: warehouses[0]?.id ?? "" });
    setScope("SELECTED");
    setItems([emptyItem()]);
    setFormError("");
    setFormOpen(true);
  }

  async function openView(count: InventoryCount) {
    setEditingId(count.id);
    setViewOnly(count.status !== "DRAFT");
    setFormError("");
    setFormOpen(true);

    try {
      const fresh = await inventoryCountService.getById(count.id);

      setDetail(fresh);
      setForm({
        warehouseId: fresh.warehouseId,
        countDate: fresh.countDate ? fresh.countDate.slice(0, 10) : "",
        observation: fresh.observation,
      });
      setItems(
        fresh.items.map((it) => ({
          productId: it.productId,
          productLabel: it.product
            ? `${it.product.code} — ${it.product.description}`
            : "",
          countedQuantity:
            it.countedQuantity != null ? String(num(it.countedQuantity)) : "",
          systemQuantity: num(it.systemQuantity),
          reservedQuantity: num(it.reservedQuantity ?? 0),
        }))
      );
    } catch (err) {
      setFormError(
        extractMessage(err, "Não foi possível carregar a contagem.")
      );
    }
  }

  const decimal = (value: string) => {
    const normalized = value.replace(/\./g, "").replace(",", ".");
    const parsed = Number(normalized);

    return Number.isFinite(parsed) ? parsed : 0;
  };

  async function fetchSystemQuantity(productId: string) {
    if (!form.warehouseId) {
      return undefined;
    }

    try {
      const result = await inventoryService.list({
        warehouseId: form.warehouseId,
        productId,
        limit: 1,
      });

      return num(result.data[0]?.quantity ?? 0);
    } catch {
      return undefined;
    }
  }

  function updateItem(index: number, patch: Partial<ItemForm>) {
    setItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, ...patch } : it))
    );
  }

  async function addItemManual(p: Product | null) {
    if (!p) {
      return;
    }

    if (items.some((it) => it.productId === p.id)) {
      setFormError("Este produto já está na contagem.");

      return;
    }

    const systemQuantity = await fetchSystemQuantity(p.id);

    setItems((prev) => {
      const withoutEmpty = prev.filter((it) => it.productId);

      return [
        ...withoutEmpty,
        {
          productId: p.id,
          productLabel: `${p.code} — ${p.description}`,
          countedQuantity: "",
          systemQuantity,
        },
        emptyItem(),
      ];
    });
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function loadGeneralScope(warehouseId: string) {
    if (!warehouseId) {
      return;
    }

    setLoadingGeneral(true);
    setFormError("");

    try {
      const result = await inventoryService.list({
        warehouseId,
        limit: 1000,
      });

      setItems(
        result.data.map((inv) => ({
          productId: inv.productId,
          productLabel: inv.product
            ? `${inv.product.code} — ${inv.product.description}`
            : "",
          countedQuantity: "",
          systemQuantity: num(inv.quantity),
          reservedQuantity: num(inv.reservedQuantity),
        }))
      );
    } catch (err) {
      setFormError(
        extractMessage(
          err,
          "Não foi possível carregar os produtos do depósito."
        )
      );
    } finally {
      setLoadingGeneral(false);
    }
  }

  function handleScopeChange(next: Scope) {
    setScope(next);

    if (next === "GENERAL") {
      void loadGeneralScope(form.warehouseId);
    } else {
      setItems([emptyItem()]);
    }
  }

  function handleWarehouseChange(warehouseId: string) {
    setForm({ ...form, warehouseId });

    if (scope === "GENERAL") {
      void loadGeneralScope(warehouseId);
    }
  }

  async function saveForm() {
    if (!form.warehouseId) {
      setFormError("Selecione o depósito.");

      return;
    }

    if (!form.observation.trim()) {
      setFormError("Informe o motivo da contagem.");

      return;
    }

    const validItems = items.filter((it) => it.productId);

    if (validItems.length === 0) {
      setFormError("Adicione ao menos um produto pra contar.");

      return;
    }

    setSaving(true);
    setFormError("");

    const payload = {
      warehouseId: form.warehouseId,
      countDate: form.countDate || undefined,
      observation: form.observation.trim(),
      items: validItems.map((it) => ({
        productId: it.productId,
        countedQuantity:
          it.countedQuantity !== ""
            ? decimal(it.countedQuantity)
            : undefined,
      })),
    };

    try {
      if (editingId) {
        await inventoryCountService.update(editingId, payload);
      } else {
        await inventoryCountService.create(payload);
      }

      setFormOpen(false);

      await load();
    } catch (err) {
      setFormError(
        extractMessage(
          err,
          "Não foi possível salvar a contagem de inventário."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  async function finalizeCount(id: string) {
    if (
      !window.confirm(
        "Finalizar esta contagem? Gera as entradas/saídas de estoque necessárias pra bater com o que foi contado — não tem como desfazer."
      )
    ) {
      return;
    }

    setActionId(id);
    setActionError("");

    try {
      await inventoryCountService.finalize(id);

      setFormOpen(false);

      await load();
    } catch (err) {
      setActionError(
        extractMessage(err, "Não foi possível finalizar a contagem.")
      );
    } finally {
      setActionId("");
    }
  }

  async function cancelCount(id: string) {
    if (!window.confirm("Cancelar esta contagem? Nada foi aplicado no estoque ainda.")) {
      return;
    }

    setActionId(id);
    setActionError("");

    try {
      await inventoryCountService.cancel(id);

      setFormOpen(false);

      await load();
    } catch (err) {
      setActionError(
        extractMessage(err, "Não foi possível cancelar a contagem.")
      );
    } finally {
      setActionId("");
    }
  }

  const semDeposito = warehouses.length === 0;
  const isDraftDetail = editingId && !viewOnly;

  return (
    <AppShell workspaceLabel="Contagem de inventário">
      <ListPageLayout
        header={
          <>
            <header>
              <Link
                href="/erp/estoque"
                className="mb-3 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              >
                <ArrowLeft size={16} />
                Voltar para Estoque
              </Link>

              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                    Contagem de inventário
                  </h1>

                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    Conte o estoque físico e feche a contagem — os
                    ajustes de entrada/saída necessários são gerados
                    sozinhos.
                  </p>
                </div>

                <Can permission="stock-movement.adjust">
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
                    Nova contagem
                  </button>
                </Can>
              </div>
            </header>

            <div className="flex flex-wrap gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={`${fieldClass} max-w-64`}
              >
                <option value="">Todos os status</option>

                {Object.entries(INVENTORY_COUNT_STATUS_LABELS).map(
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
        ) : counts.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-medium text-[var(--text-primary)]">
              Nenhuma contagem de inventário cadastrada
            </p>

            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Use &quot;Nova contagem&quot; para começar.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-[var(--surface-hover)] text-[var(--text-secondary)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Número</th>
                  <th className="px-4 py-3 font-semibold">Data</th>
                  <th className="px-4 py-3 font-semibold">Depósito</th>
                  <th className="px-4 py-3 font-semibold">Motivo</th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Itens
                  </th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>

              <tbody>
                {counts.map((c) => {
                  const busy = actionId === c.id;

                  return (
                    <tr
                      key={c.id}
                      className="border-t border-[var(--border)]"
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-[var(--text-primary)]">
                        {formatInventoryCountNumber(c.number)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-[var(--text-secondary)]">
                        {date(c.countDate ?? c.createdAt)}
                      </td>

                      <td className="px-4 py-3 text-[var(--text-secondary)]">
                        {c.warehouse?.code ?? "—"}
                      </td>

                      <td className="max-w-xs truncate px-4 py-3 text-[var(--text-secondary)]">
                        {c.observation}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-right text-[var(--text-secondary)]">
                        {c.items?.length ?? 0}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE_CLASS[c.status]}`}
                        >
                          {INVENTORY_COUNT_STATUS_LABELS[c.status]}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => void openView(c)}
                            title={
                              c.status === "DRAFT"
                                ? "Editar"
                                : "Consultar"
                            }
                            aria-label={
                              c.status === "DRAFT"
                                ? "Editar"
                                : "Consultar"
                            }
                            className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                          >
                            <Eye size={16} />
                          </button>

                          {c.status === "DRAFT" && (
                            <Can permission="stock-movement.adjust">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void cancelCount(c.id)}
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

      {/* Nova/editar/consultar contagem */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-8 w-full max-w-4xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                  {editingId
                    ? detail
                      ? formatInventoryCountNumber(detail.number)
                      : "Contagem de inventário"
                    : "Nova contagem de inventário"}
                </h2>

                {detail && (
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    {INVENTORY_COUNT_STATUS_LABELS[detail.status]}
                    {detail.createdByName &&
                      ` · Criado por ${detail.createdByName} em ${date(detail.createdAt)}`}
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
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className={labelClass}>Depósito</label>

                    <select
                      className={fieldClass}
                      value={form.warehouseId}
                      onChange={(e) =>
                        handleWarehouseChange(e.target.value)
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
                    <label className={labelClass}>Data</label>

                    <input
                      type="date"
                      className={fieldClass}
                      value={form.countDate}
                      onChange={(e) =>
                        setForm({ ...form, countDate: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      Motivo da contagem
                    </label>

                    <input
                      placeholder="Ex.: Contagem mensal de agosto"
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

                {!editingId && (
                  <div>
                    <label className={labelClass}>
                      Tipo de contagem
                    </label>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleScopeChange("SELECTED")}
                        className={`rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                          scope === "SELECTED"
                            ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
                            : "border-[var(--border)] text-[var(--text-secondary)]"
                        }`}
                      >
                        Por item selecionado
                      </button>

                      <button
                        type="button"
                        onClick={() => handleScopeChange("GENERAL")}
                        disabled={!form.warehouseId}
                        title={
                          !form.warehouseId
                            ? "Escolha o depósito primeiro"
                            : undefined
                        }
                        className={`rounded-xl border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                          scope === "GENERAL"
                            ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
                            : "border-[var(--border)] text-[var(--text-secondary)]"
                        }`}
                      >
                        Geral (todo produto do depósito)
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className={labelClass}>Itens</label>

                    {loadingGeneral && (
                      <span className="text-xs text-[var(--text-muted)]">
                        Carregando produtos do depósito...
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    {items.map((it, index) => {
                      const isLast = index === items.length - 1;
                      const saldo = it.systemQuantity;
                      const contada =
                        it.countedQuantity !== ""
                          ? decimal(it.countedQuantity)
                          : undefined;
                      const diferenca =
                        saldo != null && contada != null
                          ? contada - saldo
                          : undefined;

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
                                placeholder="Digite para buscar o produto..."
                                onSelect={(p) =>
                                  isLast
                                    ? void addItemManual(p)
                                    : updateItem(index, {
                                        productId: p?.id ?? "",
                                        productLabel: p
                                          ? `${p.code} — ${p.description}`
                                          : "",
                                      })
                                }
                              />
                            </div>

                            <div className="col-span-2">
                              <input
                                inputMode="decimal"
                                placeholder="Contada"
                                className={fieldClass}
                                value={it.countedQuantity}
                                disabled={!it.productId}
                                onChange={(e) =>
                                  updateItem(index, {
                                    countedQuantity: e.target.value,
                                  })
                                }
                              />
                            </div>

                            <div className="col-span-2 py-2.5 text-right text-sm text-[var(--text-secondary)]">
                              {saldo != null ? qty(saldo) : "—"}
                            </div>

                            <div className="col-span-2 py-2.5 text-right text-sm">
                              {diferenca != null ? (
                                <span
                                  className={
                                    diferenca === 0
                                      ? "text-[var(--text-secondary)]"
                                      : diferenca > 0
                                        ? "text-[var(--success)]"
                                        : "text-[var(--danger)]"
                                  }
                                >
                                  {diferenca > 0 ? "+" : ""}
                                  {qty(diferenca)}
                                </span>
                              ) : (
                                "—"
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              disabled={isLast}
                              title="Remover item"
                              aria-label="Remover item"
                              className="col-span-1 flex justify-center py-2 text-[var(--text-secondary)] transition-colors hover:text-[var(--danger)] disabled:opacity-30"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>

                          {it.reservedQuantity != null &&
                            it.reservedQuantity > 0 && (
                              <p className="mt-1 px-1 text-xs text-[var(--text-muted)]">
                                Reservado: {qty(it.reservedQuantity)}{" "}
                                (já incluso no saldo do sistema)
                              </p>
                            )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-2 grid grid-cols-12 gap-2 px-2 text-xs font-semibold text-[var(--text-muted)]">
                    <div className="col-span-7" />
                    <div className="col-span-2 text-right">
                      Saldo do sistema
                    </div>
                    <div className="col-span-2 text-right">Diferença</div>
                  </div>
                </div>

                {formError && (
                  <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                    {formError}
                  </div>
                )}
              </div>
            </fieldset>

            <div className="mt-4 flex justify-between gap-3">
              <div className="flex gap-3">
                {isDraftDetail && (
                  <Can permission="stock-movement.adjust">
                    <button
                      type="button"
                      disabled={actionId === editingId}
                      onClick={() =>
                        editingId && void finalizeCount(editingId)
                      }
                      className="flex items-center gap-2 rounded-xl bg-[var(--success)] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      <Check size={16} />
                      Finalizar
                    </button>
                  </Can>
                )}

                {isDraftDetail && (
                  <Can permission="stock-movement.adjust">
                    <button
                      type="button"
                      disabled={actionId === editingId}
                      onClick={() =>
                        editingId && void cancelCount(editingId)
                      }
                      className="rounded-xl border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--danger)] hover:text-[var(--danger)] disabled:opacity-60"
                    >
                      Cancelar contagem
                    </button>
                  </Can>
                )}
              </div>

              <div className="flex gap-3">
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
        </div>
      )}
    </AppShell>
  );
}
