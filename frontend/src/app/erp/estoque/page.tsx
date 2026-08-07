"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  Building2,
  History,
  Plus,
  Settings2,
  X,
} from "lucide-react";

import { AppShell } from "@/components";
import { Can } from "@/components/auth/Can";

import {
  MOVEMENT_LABELS,
  inventoryService,
  stockMovementService,
  warehouseService,
  type InventoryItem,
  type StockMovementType,
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
  });

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
    });
    setFormError("");
    setMoveOpen(true);
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

    try {
      await stockMovementService.create({
        inventoryId: moveItem.id,
        type: moveForm.type,
        quantity,
        unitCost: moveForm.unitCost
          ? decimal(moveForm.unitCost)
          : undefined,
        observation: moveForm.observation || undefined,
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

  const semDeposito = warehouses.length === 0;

  return (
    <AppShell workspaceLabel="Estoque">
      <div className="space-y-6">
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
            <option value="">Todos os depósitos</option>

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

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-xl bg-[var(--surface-hover)]"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border-strong)] p-12 text-center">
            <p className="font-medium text-[var(--text-primary)]">
              Nenhum produto em estoque
            </p>

            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Use &quot;Incluir produto&quot; para começar a
              controlar o saldo.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--surface-hover)] text-[var(--text-secondary)]">
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
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Incluir produto no estoque */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-8 w-full max-w-xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
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
          <div className="my-8 w-full max-w-xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
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
              <div className="grid gap-4 sm:grid-cols-2">
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
              </div>

              {moveForm.type === "ADJUSTMENT" && (
                <p className="text-xs text-[var(--text-muted)]">
                  O ajuste substitui o saldo atual pelo valor
                  informado.
                </p>
              )}

              <div>
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
    </AppShell>
  );
}
