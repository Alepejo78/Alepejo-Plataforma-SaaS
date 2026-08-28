"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  History,
  Lock,
  Unlock,
  X,
} from "lucide-react";

import { AppShell } from "@/components";
import { Can } from "@/components/auth/Can";
import { ListPageLayout } from "@/components/layout/ListPageLayout";
import { CurrencyInput } from "@/components/ui/CurrencyInput";

import {
  STOCK_HOLD_TYPE_LABELS,
  inventoryService,
  stockHoldService,
  warehouseService,
  type InventoryItem,
  type StockHold,
  type StockHoldType,
  type Warehouse,
} from "@/services/inventory.service";


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

  const [warehouseId, setWarehouseId] = useState("");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");

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
              O saldo é gerado por Compra, Venda ou Contagem
              de inventário.
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
