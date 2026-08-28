"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  Pencil,
  Plus,
  ScanLine,
  Trash2,
  X,
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
  type InventoryCountItem,
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
  DRAFT: "bg-[var(--surface-hover)] text-[var(--text-muted)]",
  OPEN: "bg-[var(--warning-soft)] text-[var(--warning)]",
  COUNTING: "bg-[var(--primary-soft)] text-[var(--primary)]",
  FINALIZED: "bg-[var(--warning-soft)] text-[var(--warning)]",
  ADJUSTED: "bg-[var(--success-soft)] text-[var(--success)]",
  CANCELLED: "bg-[var(--danger-soft)] text-[var(--danger)]",
};

type Scope = "GENERAL" | "SELECTED";

type Round = 1 | 2 | 3;

interface ItemForm {
  productId: string;
  productLabel: string;
  systemQuantity?: number;
}

function emptyItem(): ItemForm {
  return { productId: "", productLabel: "" };
}

function emptyForm() {
  return {
    warehouseId: "",
    countDate: todayIso(),
    observation: "",
  };
}

/** Quantos itens ainda faltam contar em cada rodada. */
function pendingByRound(items: InventoryCountItem[]) {
  return {
    1: items.filter((i) => i.status === "PENDING").length,
    2: items.filter((i) => i.status === "RECOUNT_2").length,
    3: items.filter((i) => i.status === "RECOUNT_3").length,
  } as Record<Round, number>;
}

/** Primeira rodada que ainda tem item pra contar (1 se não sobrou nada). */
function firstOpenRound(items: InventoryCountItem[]): Round {
  const pending = pendingByRound(items);

  if (pending[1] > 0) return 1;
  if (pending[2] > 0) return 2;
  if (pending[3] > 0) return 3;

  return 1;
}

export default function InventarioPage() {
  const [counts, setCounts] = useState<InventoryCount[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  const [statusFilter, setStatusFilter] = useState("");

  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");

  // Modal de abrir/editar contagem (só a lista de produtos a contar)
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [scope, setScope] = useState<Scope>("SELECTED");
  const [items, setItems] = useState<ItemForm[]>([emptyItem()]);
  const [loadingGeneral, setLoadingGeneral] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Modal de leitura (Iniciar contagem)
  const [scanOpen, setScanOpen] = useState(false);
  const [scanCount, setScanCount] = useState<InventoryCount | null>(null);
  const [scanRound, setScanRound] = useState<Round>(1);
  const [scanCode, setScanCode] = useState("");
  const [scanProduct, setScanProduct] = useState<Product | null>(null);
  const [scanQuantity, setScanQuantity] = useState("");
  const [scanError, setScanError] = useState("");
  const [scanBusy, setScanBusy] = useState(false);
  const [scanLog, setScanLog] = useState<
    { label: string; quantity: string }[]
  >([]);
  const codeInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);

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
    setForm({ ...emptyForm(), warehouseId: warehouses[0]?.id ?? "" });
    setScope("SELECTED");
    setItems([emptyItem()]);
    setFormError("");
    setFormOpen(true);
  }

  async function openEdit(count: InventoryCount) {
    setEditingId(count.id);
    setFormError("");
    setFormOpen(true);

    try {
      const fresh = await inventoryCountService.getById(count.id);

      setForm({
        warehouseId: fresh.warehouseId,
        countDate: fresh.countDate ? fresh.countDate.slice(0, 10) : "",
        observation: fresh.observation,
      });
      setScope("SELECTED");
      setItems(
        fresh.items.map((it) => ({
          productId: it.productId,
          productLabel: it.product
            ? `${it.product.code} — ${it.product.description}`
            : "",
          systemQuantity: num(it.systemQuantity),
        }))
      );
    } catch (err) {
      setFormOpen(false);
      setActionError(
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
      const all: Awaited<
        ReturnType<typeof inventoryService.list>
      >["data"] = [];

      let page = 1;
      let pages = 1;

      do {
        const result = await inventoryService.list({
          warehouseId,
          page,
          limit: 100,
        });

        all.push(...result.data);
        pages = result.pages;
        page += 1;
      } while (page <= pages);

      setItems(
        all.map((inv) => ({
          productId: inv.productId,
          productLabel: inv.product
            ? `${inv.product.code} — ${inv.product.description}`
            : "",
          systemQuantity: num(inv.quantity),
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
      items: validItems.map((it) => ({ productId: it.productId })),
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

  async function openScan(count: InventoryCount) {
    setScanCount(count);
    setScanCode("");
    setScanProduct(null);
    setScanQuantity("");
    setScanError("");
    setScanLog([]);
    setScanOpen(true);

    // Sempre parte do estado real (a lista pode ter mudado desde o
    // último carregamento da tela).
    try {
      const fresh = await inventoryCountService.getById(count.id);

      setScanCount(fresh);
      setScanRound(firstOpenRound(fresh.items));
    } catch {
      setScanRound(firstOpenRound(count.items ?? []));
    }

    setTimeout(() => codeInputRef.current?.focus(), 50);
  }

  // Pré-visualiza o produto do código digitado/lido — mesma resolução
  // do backend (código de barras exato, senão código exato).
  useEffect(() => {
    if (!scanOpen) {
      return;
    }

    const code = scanCode.trim();

    if (!code) {
      setScanProduct(null);

      return;
    }

    let cancelled = false;

    const timer = setTimeout(() => {
      productService
        .list({ search: code, limit: 5 })
        .then((result) => {
          if (cancelled) {
            return;
          }

          const match =
            result.data.find((p) => p.barcode === code) ??
            result.data.find((p) => p.code === code) ??
            null;

          setScanProduct(match);

          if (!match) {
            setScanError("Produto não encontrado.");
          } else {
            setScanError("");
          }
        })
        .catch(() => {
          if (!cancelled) {
            setScanProduct(null);
          }
        });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [scanCode, scanOpen]);

  async function submitScan(confirmAdd = false) {
    if (!scanCount || !scanCode.trim()) {
      return;
    }

    const quantity = decimal(scanQuantity);

    setScanBusy(true);
    setScanError("");

    try {
      const updated = await inventoryCountService.count(scanCount.id, {
        code: scanCode.trim(),
        quantity,
        confirmAdd: confirmAdd || undefined,
      });

      setScanCount(updated);

      setScanLog((prev) => [
        {
          label: scanProduct
            ? `${scanProduct.code} — ${scanProduct.description}`
            : scanCode.trim(),
          quantity: qty(quantity),
        },
        ...prev,
      ]);

      setScanCode("");
      setScanProduct(null);
      setScanQuantity("");
      codeInputRef.current?.focus();

      await load();
    } catch (err) {
      const message = extractMessage(
        err,
        "Não foi possível registrar a leitura."
      );

      if (!confirmAdd && message === "Item não consta no inventário.") {
        if (
          window.confirm("Item não consta no inventário. Deseja incluí-lo?")
        ) {
          setScanBusy(false);

          return submitScan(true);
        }

        setScanCode("");
        setScanProduct(null);
        codeInputRef.current?.focus();
      } else {
        setScanError(message);
      }
    } finally {
      setScanBusy(false);
    }
  }

  function handleCodeKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && scanCode.trim()) {
      e.preventDefault();
      qtyInputRef.current?.focus();
    }
  }

  function handleQuantityKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      void submitScan();
    }
  }

  const semDeposito = warehouses.length === 0;

  const scanPending = scanCount
    ? pendingByRound(scanCount.items)
    : ({ 1: 0, 2: 0, 3: 0 } as Record<Round, number>);
  const remainingInRound = scanPending[scanRound];
  const nextRound: Round | null =
    remainingInRound === 0
      ? scanRound === 1 && scanPending[2] > 0
        ? 2
        : scanRound <= 2 && scanPending[3] > 0
          ? 3
          : null
      : null;

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
                    Abra a contagem e conte na tela de leitura. Para
                    acompanhar, corrigir e finalizar, use o
                    Acompanhamento.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Can permission="inventory-count.track">
                    <Link
                      href="/erp/estoque/inventario/acompanhamento"
                      className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                    >
                      <BarChart3 size={18} />
                      Acompanhamento
                    </Link>
                  </Can>

                  <Can permission="inventory-count.create">
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
              </div>
            </header>

            <div className="flex flex-wrap gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={`${fieldClass} max-w-64`}
              >
                <option value="">Todos os status</option>

                {(
                  [
                    "OPEN",
                    "COUNTING",
                    "FINALIZED",
                    "ADJUSTED",
                    "CANCELLED",
                  ] as InventoryCountStatus[]
                ).map((value) => (
                  <option key={value} value={value}>
                    {INVENTORY_COUNT_STATUS_LABELS[value]}
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
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Contados</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>

              <tbody>
                {counts.map((c) => {
                  const items = c.items ?? [];
                  const done = items.filter(
                    (i) => i.status === "DONE"
                  ).length;
                  const contavel =
                    c.status === "OPEN" || c.status === "COUNTING";

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

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE_CLASS[c.status]}`}
                        >
                          {INVENTORY_COUNT_STATUS_LABELS[c.status]}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-[var(--text-secondary)]">
                        {items.length === 0
                          ? "—"
                          : `${done}/${items.length}`}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {c.status === "OPEN" && (
                            <Can permission="inventory-count.update">
                              <button
                                type="button"
                                onClick={() => void openEdit(c)}
                                title="Editar itens"
                                aria-label="Editar itens"
                                className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                              >
                                <Pencil size={16} />
                              </button>
                            </Can>
                          )}

                          {contavel && (
                            <Can permission="inventory-count.update">
                              <button
                                type="button"
                                disabled={actionId === c.id}
                                onClick={() => void openScan(c)}
                                title="Iniciar contagem"
                                aria-label="Iniciar contagem"
                                className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:opacity-50"
                              >
                                <ScanLine size={16} />
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

      {/* Abrir/editar contagem (lista de produtos a contar) */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-8 w-full max-w-4xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
            <div className="mb-6 flex items-start justify-between">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                {editingId
                  ? "Editar contagem"
                  : "Nova contagem de inventário"}
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
                  <label className={labelClass}>Tipo de contagem</label>

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
                  <label className={labelClass}>Itens a contar</label>

                  {loadingGeneral && (
                    <span className="text-xs text-[var(--text-muted)]">
                      Carregando produtos do depósito...
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  {items.map((it, index) => {
                    const isLast = index === items.length - 1;

                    return (
                      <div
                        key={index}
                        className="grid grid-cols-12 items-center gap-2"
                      >
                        <div className="col-span-9">
                          {isLast ? (
                            <SearchSelect<Product>
                              displayLabel={it.productLabel}
                              search={searchProducts}
                              getId={(p) => p.id}
                              getLabel={(p) =>
                                `${p.code} — ${p.description}`
                              }
                              placeholder="Digite para buscar o produto..."
                              onSelect={(p) => void addItemManual(p)}
                            />
                          ) : (
                            <p className="px-1 text-sm text-[var(--text-primary)]">
                              {it.productLabel}
                            </p>
                          )}
                        </div>

                        <div className="col-span-2 text-right text-sm text-[var(--text-secondary)]">
                          {it.systemQuantity != null
                            ? `Saldo: ${qty(it.systemQuantity)}`
                            : ""}
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
                    );
                  })}
                </div>
              </div>

              {formError && (
                <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                  {formError}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
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
      )}

      {/* Iniciar contagem (leitura por código de barras/código) */}
      {scanOpen && scanCount && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-8 w-full max-w-4xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                  Contagem {scanRound} —{" "}
                  {formatInventoryCountNumber(scanCount.number)}
                </h2>

                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  {remainingInRound > 0
                    ? `Faltam ${remainingInRound} item(ns) nesta contagem. Leia o código de barras (leitor USB), digite o código ou escolha o produto.`
                    : "Nada mais a contar nesta rodada."}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setScanOpen(false)}
                aria-label="Fechar"
                className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Código do produto</label>

                  <input
                    ref={codeInputRef}
                    autoFocus
                    className={fieldClass}
                    value={scanCode}
                    disabled={scanBusy}
                    onChange={(e) => setScanCode(e.target.value)}
                    onKeyDown={handleCodeKeyDown}
                    placeholder="Escaneie ou digite..."
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Ou escolha o produto
                  </label>

                  <SearchSelect<Product>
                    displayLabel={
                      scanProduct
                        ? `${scanProduct.code} — ${scanProduct.description}`
                        : ""
                    }
                    search={searchProducts}
                    getId={(p) => p.id}
                    getLabel={(p) => `${p.code} — ${p.description}`}
                    placeholder="Clique e busque pelo nome..."
                    disabled={scanBusy}
                    onSelect={(p) => {
                      setScanProduct(p);
                      setScanCode(p?.code ?? "");
                      setScanError("");

                      if (p) {
                        qtyInputRef.current?.focus();
                      }
                    }}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>
                    Quantidade contada
                  </label>

                  <input
                    ref={qtyInputRef}
                    inputMode="decimal"
                    className={fieldClass}
                    value={scanQuantity}
                    disabled={scanBusy}
                    onChange={(e) => setScanQuantity(e.target.value)}
                    onKeyDown={handleQuantityKeyDown}
                    placeholder="0"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    disabled={scanBusy || !scanCode.trim()}
                    onClick={() => void submitScan()}
                    className="h-11 w-full rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--primary-contrast)] disabled:opacity-60"
                  >
                    {scanBusy ? "Registrando..." : "Confirmar"}
                  </button>
                </div>
              </div>

              {scanError && (
                <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                  {scanError}
                </div>
              )}

              {/* Rodada acabou: só o caminho pra próxima, sem listar o
                  que precisa recontar (isso é do Acompanhamento). */}
              {remainingInRound === 0 && (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] p-4">
                  {nextRound ? (
                    <>
                      <p className="text-sm text-[var(--text-primary)]">
                        Contagem {scanRound} concluída. Ainda há
                        item(ns) para recontar.
                      </p>

                      <button
                        type="button"
                        onClick={() => {
                          setScanRound(nextRound);
                          setScanCode("");
                          setScanProduct(null);
                          setScanQuantity("");
                          setScanError("");

                          setTimeout(
                            () => codeInputRef.current?.focus(),
                            50
                          );
                        }}
                        className="mt-3 flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-contrast)]"
                      >
                        <ScanLine size={16} />
                        Iniciar contagem {nextRound}
                      </button>
                    </>
                  ) : (
                    <p className="text-sm text-[var(--success)]">
                      Tudo contado. Finalize a contagem no
                      Acompanhamento de inventário.
                    </p>
                  )}
                </div>
              )}

              {scanLog.length > 0 && (
                <div className="border-t border-[var(--border)] pt-3">
                  <p className={labelClass}>Leituras desta sessão</p>

                  <div className="max-h-64 space-y-1 overflow-y-auto">
                    {scanLog.map((entry, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                      >
                        <span className="text-[var(--text-primary)]">
                          {entry.label}
                        </span>

                        <span className="text-[var(--text-secondary)]">
                          {entry.quantity}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
