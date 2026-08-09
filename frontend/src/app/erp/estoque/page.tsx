"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  Building2,
  History,
  Lock,
  Plus,
  Settings2,
  Unlock,
  X,
} from "lucide-react";

import { AppShell } from "@/components";
import { Can } from "@/components/auth/Can";
import { ListPageLayout } from "@/components/layout/ListPageLayout";

import {
  MOVEMENT_LABELS,
  STOCK_HOLD_TYPE_LABELS,
  inventoryService,
  stockHoldService,
  stockMovementService,
  warehouseService,
  type InventoryItem,
  type StockHold,
  type StockHoldType,
  type StockMovementType,
  type Warehouse,
} from "@/services/inventory.service";

import {
  productService,
  type Product,
} from "@/services/product.service";

import {
  DOCUMENT_TYPE_LABELS,
  type FinancialDocumentType,
} from "@/services/financial-entry.service";

function num(value: string | number | null | undefined) {
  return Number(value ?? 0);
}

function qty(value: string | number | null | undefined) {
  return num(value).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}

function available(item: InventoryItem) {
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

export default function EstoquePage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>(
    []
  );
  const [products, setProducts] = useState<Product[]>([]);

  const [warehouseId, setWarehouseId] = useState("");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");

  // Modal de incluir produto no estoque
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    productId: "",
    warehouseId: "",
    quantity: "",
    averageCost: "",
  });

  // Modal de movimentação
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveItem, setMoveItem] =
    useState<InventoryItem | null>(null);
  const [moveForm, setMoveForm] = useState({
    type: "ENTRY" as StockMovementType,
    quantity: "",
    unitCost: "",
    observation: "",
    documentType: "" as FinancialDocumentType | "",
    documentNumber: "",
  });

  // Modal de retenções (bloqueio/reserva/quarentena/avaria)
  const [holdOpen, setHoldOpen] = useState(false);
  const [holdItem, setHoldItem] =
    useState<InventoryItem | null>(null);
  const [holds, setHolds] = useState<StockHold[]>([]);
  const [holdsLoading, setHoldsLoading] = useState(false);
  const [holdForm, setHoldForm] = useState({
    type: "BLOCKED" as StockHoldType,
    quantity: "",
    reason: "",
  });
  const [holdBusyId, setHoldBusyId] = useState("");

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    Promise.all([
      warehouseService.list(),
      productService.list({ limit: 100 }),
    ])
      .then(([wh, pr]) => {
        setWarehouses(wh);
        setProducts(pr.data ?? []);
      })
      .catch(() => {
        setListError(
          "Não foi possível carregar depósitos e produtos."
        );
      });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setListError("");

    try {
      const result = await inventoryService.list({
        search: search || undefined,
        warehouseId: warehouseId || undefined,
      });

      setItems(result.data ?? []);
    } catch (err) {
      setListError(
        extractMessage(
          err,
          "Não foi possível carregar o estoque."
        )
      );
    } finally {
      setLoading(false);
    }
  }, [search, warehouseId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 300);

    return () => clearTimeout(timer);
  }, [load]);

  function openAdd() {
    setAddForm({
      productId: "",
      warehouseId: warehouses[0]?.id ?? "",
      quantity: "",
      averageCost: "",
    });
    setFormError("");
    setAddOpen(true);
  }

  function openMove(
    item: InventoryItem,
    type: StockMovementType
  ) {
    setMoveItem(item);
    setMoveForm({
      type,
      quantity: "",
      unitCost: "",
      observation: "",
      documentType: "",
      documentNumber: "",
    });
    setFormError("");
    setMoveOpen(true);
  }

  async function loadHolds(inventoryId: string) {
    setHoldsLoading(true);

    try {
      const result = await stockHoldService.list({
        inventoryId,
        status: "ACTIVE",
      });

      setHolds(result);
    } catch {
      setFormError(
        "Não foi possível carregar as retenções."
      );
    } finally {
      setHoldsLoading(false);
    }
  }

  function openHold(item: InventoryItem) {
    setHoldItem(item);
    setHoldForm({
      type: "BLOCKED",
      quantity: "",
      reason: "",
    });
    setFormError("");
    setHoldOpen(true);

    void loadHolds(item.id);
  }

  const decimal = (value: string) => {
    const normalized = value
      .replace(/\./g, "")
      .replace(",", ".");

    const parsed = Number(normalized);

    return Number.isFinite(parsed) ? parsed : 0;
  };

  async function saveAdd() {
    if (!addForm.productId || !addForm.warehouseId) {
      setFormError(
        "Selecione o produto e o depósito."
      );

      return;
    }

    setSaving(true);
    setFormError("");

    try {
      await inventoryService.create({
        productId: addForm.productId,
        warehouseId: addForm.warehouseId,
        quantity: decimal(addForm.quantity),
        averageCost: decimal(addForm.averageCost),
      });

      setAddOpen(false);

      await load();
    } catch (err) {
      setFormError(
        extractMessage(
          err,
          "Não foi possível incluir o produto no estoque."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveMove() {
    if (!moveItem) {
      return;
    }

    const quantity = decimal(moveForm.quantity);

    if (quantity <= 0) {
      setFormError("Informe uma quantidade maior que zero.");

      return;
    }

    setSaving(true);
    setFormError("");

    const documentNumber =
      moveForm.type === "ADJUSTMENT"
        ? undefined
        : moveForm.documentType || moveForm.documentNumber
          ? [
              moveForm.documentType
                ? DOCUMENT_TYPE_LABELS[moveForm.documentType]
                : "Documento",
              moveForm.documentNumber
                ? `nº ${moveForm.documentNumber}`
                : "",
            ]
              .filter(Boolean)
              .join(" ")
          : undefined;

    const observation =
      moveForm.type === "ADJUSTMENT"
        ? moveForm.observation || undefined
        : undefined;

    try {
      await stockMovementService.create({
        inventoryId: moveItem.id,
        type: moveForm.type,
        quantity,
        unitCost: moveForm.unitCost
          ? decimal(moveForm.unitCost)
          : undefined,
        observation,
        documentNumber,
      });

      setMoveOpen(false);

      await load();
    } catch (err) {
      setFormError(
        extractMessage(
          err,
          "Não foi possível registrar a movimentação."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveHold() {
    if (!holdItem) {
      return;
    }

    const quantity = decimal(holdForm.quantity);

    if (quantity <= 0) {
      setFormError("Informe uma quantidade maior que zero.");

      return;
    }

    setSaving(true);
    setFormError("");

    try {
      await stockHoldService.create({
        inventoryId: holdItem.id,
        type: holdForm.type,
        quantity,
        reason: holdForm.reason || undefined,
      });

      setHoldForm({
        type: "BLOCKED",
        quantity: "",
        reason: "",
      });

      await loadHolds(holdItem.id);
      await load();
    } catch (err) {
      setFormError(
        extractMessage(
          err,
          "Não foi possível registrar a retenção."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  async function releaseHold(id: string) {
    if (!holdItem) {
      return;
    }

    setHoldBusyId(id);

    try {
      await stockHoldService.release(id);

      await loadHolds(holdItem.id);
      await load();
    } catch (err) {
      setFormError(
        extractMessage(
          err,
          "Não foi possível liberar a retenção."
        )
      );
    } finally {
      setHoldBusyId("");
    }
  }

  const semDeposito = warehouses.length === 0;

  return (
    <AppShell workspaceLabel="Estoque">
      <ListPageLayout
        header={
          <>
            <header className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                  Saldo em estoque
                </h1>

                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Quantidade disponível de cada produto por
                  depósito.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href="/erp/estoque/movimentacoes"
                  className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                >
                  <History size={18} />
                  Movimentações
                </Link>

                <Link
                  href="/erp/estoque/depositos"
                  className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                >
                  <Settings2 size={18} />
                  Depósitos
                </Link>

                <Can permission="inventory.create">
                  <button
                    type="button"
                    onClick={openAdd}
                    disabled={semDeposito}
                    title={
                      semDeposito
                        ? "Cadastre um depósito primeiro"
                        : undefined
                    }
                    className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-50"
                  >
                    <Plus size={18} />
                    Incluir produto
                  </button>
                </Can>
              </div>
            </header>

            {semDeposito && (
              <div className="flex items-center gap-3 rounded-xl border border-[var(--warning)] bg-[var(--warning-soft)] p-3 text-sm text-[var(--warning)]">
                <Building2 size={18} className="shrink-0" />

                <span>
                  Nenhum depósito cadastrado.{" "}
                  <Link
                    href="/erp/estoque/depositos"
                    className="underline"
                  >
                    Cadastre um depósito
                  </Link>{" "}
                  para começar a controlar estoque.
                </span>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <select
                value={warehouseId}
                onChange={(e) =>
                  setWarehouseId(e.target.value)
                }
                className={`${fieldClass} max-w-64`}
              >
                <option value="">
                  Todos os depósitos
                </option>

                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.code} — {w.description}
                  </option>
                ))}
              </select>

              <input
                placeholder="Buscar produto"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`${fieldClass} min-w-64 flex-1`}
              />
            </div>

            {listError && (
              <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                {listError}
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
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-medium text-[var(--text-primary)]">
              Nenhum produto em estoque
            </p>

            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Use &quot;Incluir produto&quot; para começar a
              controlar o saldo.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-[var(--surface-hover)] text-[var(--text-secondary)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">
                    Produto
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Depósito
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Saldo
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Disponível
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Bloqueado / retido
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Custo médio
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Total
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>

              <tbody>
                {items.map((item) => {
                  const saldo = num(item.quantity);
                  const disponivel = available(item);
                  const temRetencao = disponivel < saldo;

                  const minimo = num(
                    item.product?.minimumStock
                  );

                  const abaixoMinimo =
                    minimo > 0 && saldo < minimo;

                  return (
                    <tr
                      key={item.id}
                      className="border-t border-[var(--border)]"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-[var(--text-primary)]">
                          {item.product?.description ?? "—"}
                        </p>

                        <p className="text-xs text-[var(--text-muted)]">
                          {item.product?.code}
                        </p>
                      </td>

                      <td className="px-4 py-3 text-[var(--text-secondary)]">
                        {item.warehouse?.code ?? "—"}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <span
                          className={
                            abaixoMinimo
                              ? "inline-flex items-center gap-1.5 font-semibold text-[var(--danger)]"
                              : "font-medium text-[var(--text-primary)]"
                          }
                          title={
                            abaixoMinimo
                              ? `Abaixo do estoque mínimo (${qty(minimo)})`
                              : undefined
                          }
                        >
                          {abaixoMinimo && (
                            <AlertTriangle size={14} />
                          )}

                          {qty(saldo)}{" "}
                          {item.product?.unit?.code ?? ""}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <span
                          className={
                            temRetencao
                              ? "font-medium text-[var(--warning)]"
                              : "text-[var(--text-secondary)]"
                          }
                          title={
                            temRetencao
                              ? "Parte do saldo está bloqueada, reservada, em quarentena ou avariada"
                              : undefined
                          }
                        >
                          {qty(disponivel)}{" "}
                          {item.product?.unit?.code ?? ""}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        {!item.holds ||
                        item.holds.length === 0 ? (
                          <span className="text-[var(--text-muted)]">
                            —
                          </span>
                        ) : (
                          <div className="space-y-0.5">
                            {item.holds.map((h) => (
                              <p
                                key={h.id}
                                className="text-xs text-[var(--warning)]"
                              >
                                {
                                  STOCK_HOLD_TYPE_LABELS[
                                    h.type
                                  ]
                                }
                                : {qty(h.quantity)}
                                {h.reason
                                  ? ` — ${h.reason}`
                                  : ""}
                              </p>
                            ))}
                          </div>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-right text-[var(--text-secondary)]">
                        {money(item.averageCost)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-[var(--text-primary)]">
                        {money(
                          saldo * num(item.averageCost)
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Can permission="stock-movement.create">
                            <button
                              type="button"
                              onClick={() =>
                                openMove(item, "ENTRY")
                              }
                              title="Entrada"
                              aria-label="Entrada"
                              className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--success)] hover:text-[var(--success)]"
                            >
                              <ArrowUpCircle size={16} />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                openMove(item, "EXIT")
                              }
                              title="Saída"
                              aria-label="Saída"
                              className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--danger)] hover:text-[var(--danger)]"
                            >
                              <ArrowDownCircle size={16} />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                openMove(item, "ADJUSTMENT")
                              }
                              title="Ajuste"
                              aria-label="Ajuste"
                              className="rounded-lg border border-[var(--border)] px-2 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]"
                            >
                              Ajuste
                            </button>
                          </Can>

                          <Can permission="inventory.hold">
                            <button
                              type="button"
                              onClick={() => openHold(item)}
                              title="Bloqueio, reserva, quarentena e avaria"
                              aria-label="Retenções de estoque"
                              className={
                                temRetencao
                                  ? "rounded-lg border border-[var(--warning)] p-2 text-[var(--warning)] transition-colors hover:bg-[var(--warning-soft)]"
                                  : "rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]"
                              }
                            >
                              <Lock size={16} />
                            </button>
                          </Can>
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

      {/* Incluir produto no estoque */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-8 w-full max-w-2xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                Incluir produto no estoque
              </h2>

              <button
                type="button"
                onClick={() => setAddOpen(false)}
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
                    Produto
                  </label>

                  <select
                    className={fieldClass}
                    value={addForm.productId}
                    onChange={(e) =>
                      setAddForm({
                        ...addForm,
                        productId: e.target.value,
                      })
                    }
                  >
                    <option value="">Selecione...</option>

                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} — {p.description}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>
                    Depósito
                  </label>

                  <select
                    className={fieldClass}
                    value={addForm.warehouseId}
                    onChange={(e) =>
                      setAddForm({
                        ...addForm,
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
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>
                    Quantidade inicial
                  </label>

                  <input
                    inputMode="decimal"
                    placeholder="0"
                    className={fieldClass}
                    value={addForm.quantity}
                    onChange={(e) =>
                      setAddForm({
                        ...addForm,
                        quantity: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Custo médio (R$)
                  </label>

                  <input
                    inputMode="decimal"
                    placeholder="0,00"
                    className={fieldClass}
                    value={addForm.averageCost}
                    onChange={(e) =>
                      setAddForm({
                        ...addForm,
                        averageCost: e.target.value,
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
                  onClick={() => setAddOpen(false)}
                  className="rounded-xl border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--text-secondary)]"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void saveAdd()}
                  className="rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] disabled:opacity-60"
                >
                  {saving ? "Salvando..." : "Incluir"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Movimentação */}
      {moveOpen && moveItem && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-8 w-full max-w-2xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                  {MOVEMENT_LABELS[moveForm.type]}
                </h2>

                <p className="text-sm text-[var(--text-muted)]">
                  {moveItem.product?.description} ·{" "}
                  {moveItem.warehouse?.code} · saldo atual{" "}
                  {qty(moveItem.quantity)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setMoveOpen(false)}
                aria-label="Fechar"
                className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className={labelClass}>
                    {moveForm.type === "ADJUSTMENT"
                      ? "Novo saldo"
                      : "Quantidade"}
                  </label>

                  <input
                    autoFocus
                    inputMode="decimal"
                    placeholder="0"
                    className={fieldClass}
                    value={moveForm.quantity}
                    onChange={(e) =>
                      setMoveForm({
                        ...moveForm,
                        quantity: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Custo unitário (R$)
                  </label>

                  <input
                    inputMode="decimal"
                    placeholder="0,00"
                    className={fieldClass}
                    value={moveForm.unitCost}
                    onChange={(e) =>
                      setMoveForm({
                        ...moveForm,
                        unitCost: e.target.value,
                      })
                    }
                  />
                </div>

                {moveForm.type === "ADJUSTMENT" ? (
                  <div className="sm:col-span-2">
                    <label className={labelClass}>
                      Observação
                    </label>

                    <input
                      className={fieldClass}
                      value={moveForm.observation}
                      onChange={(e) =>
                        setMoveForm({
                          ...moveForm,
                          observation: e.target.value,
                        })
                      }
                    />
                  </div>
                ) : (
                  <>
                    <div>
                      <label className={labelClass}>
                        Tipo de documento
                      </label>

                      <select
                        className={fieldClass}
                        value={moveForm.documentType}
                        onChange={(e) =>
                          setMoveForm({
                            ...moveForm,
                            documentType: e.target
                              .value as
                              | FinancialDocumentType
                              | "",
                          })
                        }
                      >
                        <option value="">Selecione...</option>

                        {Object.entries(
                          DOCUMENT_TYPE_LABELS
                        ).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={labelClass}>
                        Número do documento
                      </label>

                      <input
                        className={fieldClass}
                        value={moveForm.documentNumber}
                        onChange={(e) =>
                          setMoveForm({
                            ...moveForm,
                            documentNumber: e.target.value,
                          })
                        }
                      />
                    </div>
                  </>
                )}
              </div>

              {moveForm.type === "ADJUSTMENT" && (
                <p className="text-xs text-[var(--text-muted)]">
                  O ajuste substitui o saldo atual pelo valor
                  informado.
                </p>
              )}

              {formError && (
                <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                  {formError}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setMoveOpen(false)}
                  className="rounded-xl border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--text-secondary)]"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void saveMove()}
                  className="rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] disabled:opacity-60"
                >
                  {saving ? "Salvando..." : "Confirmar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Retenções de estoque */}
      {holdOpen && holdItem && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-8 w-full max-w-2xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                  Retenções de estoque
                </h2>

                <p className="text-sm text-[var(--text-muted)]">
                  {holdItem.product?.description} ·{" "}
                  {holdItem.warehouse?.code} · saldo{" "}
                  {qty(holdItem.quantity)} · disponível{" "}
                  {qty(available(holdItem))}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setHoldOpen(false)}
                aria-label="Fechar"
                className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className={labelClass}>Tipo</label>

                  <select
                    className={fieldClass}
                    value={holdForm.type}
                    onChange={(e) =>
                      setHoldForm({
                        ...holdForm,
                        type: e.target
                          .value as StockHoldType,
                      })
                    }
                  >
                    {Object.entries(
                      STOCK_HOLD_TYPE_LABELS
                    ).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
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
                    value={holdForm.quantity}
                    onChange={(e) =>
                      setHoldForm({
                        ...holdForm,
                        quantity: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Motivo
                  </label>

                  <input
                    className={fieldClass}
                    value={holdForm.reason}
                    onChange={(e) =>
                      setHoldForm({
                        ...holdForm,
                        reason: e.target.value,
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

              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void saveHold()}
                  className="rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] disabled:opacity-60"
                >
                  {saving ? "Salvando..." : "Reter"}
                </button>
              </div>

              <div className="border-t border-[var(--border)] pt-4">
                <p className={labelClass}>
                  Retenções ativas
                </p>

                {holdsLoading ? (
                  <div className="h-10 animate-pulse rounded-xl bg-[var(--surface-hover)]" />
                ) : holds.length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)]">
                    Nenhuma retenção ativa.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {holds.map((h) => (
                      <div
                        key={h.id}
                        className="flex items-center justify-between rounded-xl border border-[var(--border)] p-3 text-sm"
                      >
                        <div>
                          <p className="font-medium text-[var(--text-primary)]">
                            {
                              STOCK_HOLD_TYPE_LABELS[
                                h.type
                              ]
                            }{" "}
                            — {qty(h.quantity)}
                          </p>

                          {h.reason && (
                            <p className="text-xs text-[var(--text-muted)]">
                              {h.reason}
                            </p>
                          )}
                        </div>

                        <Can permission="inventory.release-hold">
                          <button
                            type="button"
                            disabled={
                              holdBusyId === h.id
                            }
                            onClick={() =>
                              void releaseHold(h.id)
                            }
                            title="Liberar"
                            aria-label="Liberar"
                            className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--success)] hover:text-[var(--success)] disabled:opacity-50"
                          >
                            <Unlock size={16} />
                          </button>
                        </Can>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
