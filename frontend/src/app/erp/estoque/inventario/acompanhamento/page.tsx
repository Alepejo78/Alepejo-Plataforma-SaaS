"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  Gauge,
  Lock,
  Package,
  RefreshCw,
  RotateCcw,
  Target,
  Trash2,
  Users,
  X,
} from "lucide-react";

import { AppShell } from "@/components";
import { Can } from "@/components/auth/Can";
import { ListPageLayout } from "@/components/layout/ListPageLayout";
import { useAuth } from "@/providers/AuthProvider";

import {
  INVENTORY_COUNT_ITEM_STATUS_LABELS,
  INVENTORY_COUNT_STATUS_LABELS,
  formatInventoryCountNumber,
  inventoryCountService,
  type InventoryCount,
  type InventoryCountItem,
  type InventoryCountItemStatus,
  type InventoryCountStatus,
} from "@/services/inventory-count.service";

function num(value: string | number | null | undefined) {
  return Number(value ?? 0);
}

function qty(value: string | number | null | undefined) {
  return num(value).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}

function money(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function percent(value: number) {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
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

/** Valor que vai ser usado no ajuste: a última rodada preenchida. */
function finalQuantity(item: InventoryCountItem): number | null {
  if (item.countedQuantity3 != null) return num(item.countedQuantity3);
  if (item.countedQuantity2 != null) return num(item.countedQuantity2);
  if (item.countedQuantity1 != null) return num(item.countedQuantity1);
  return null;
}

/** Valor contábil do ajuste (diferença × custo médio) — null se ainda sem contagem. */
function adjustmentValue(item: InventoryCountItem): number | null {
  const final = finalQuantity(item);

  if (final == null) {
    return null;
  }

  return (final - num(item.systemQuantity)) * num(item.unitCost);
}

function countAdjustmentValue(items: InventoryCountItem[]) {
  return items.reduce(
    (sum, item) => sum + (adjustmentValue(item) ?? 0),
    0
  );
}

function summarize(items: InventoryCountItem[]) {
  const counts: Record<InventoryCountItemStatus, number> = {
    PENDING: 0,
    RECOUNT_2: 0,
    RECOUNT_3: 0,
    DONE: 0,
  };

  items.forEach((item) => {
    counts[item.status] += 1;
  });

  return counts;
}

interface DashboardStats {
  activeCountsTotal: number;
  totalItems: number;
  counted: number;
  pendingCount: number;
  okCount: number;
  diffCount: number;
  awaitingRecount: number;
  progressPct: number;
  accuracyPct: number | null;
  adjustmentTotal: number;
  ranking: { name: string; count: number }[];
}

/** Resumo geral das contagens em andamento (OPEN/COUNTING) — base do painel do topo. */
function computeDashboard(activeCounts: InventoryCount[]): DashboardStats {
  let totalItems = 0;
  let pendingCount = 0;
  let okCount = 0;
  let diffCount = 0;
  let awaitingRecount = 0;
  let adjustmentTotal = 0;

  const userTally = new Map<string, number>();

  activeCounts.forEach((count) => {
    count.items.forEach((item) => {
      totalItems += 1;

      if (item.status === "PENDING") {
        pendingCount += 1;
      }

      if (item.status === "RECOUNT_2" || item.status === "RECOUNT_3") {
        awaitingRecount += 1;
      }

      // Conta pela última leitura que existir, não só pelos itens já
      // "Finalizado" — um item "Aguardando recontagem" já tem uma
      // diferença conhecida (é por isso que está recontando), então
      // também entra em "Com diferença"/acuracidade, igual já
      // acontecia na coluna da tabela abaixo.
      const final = finalQuantity(item);

      if (final != null) {
        const diff = final - num(item.systemQuantity);

        if (Math.abs(diff) < 0.0005) {
          okCount += 1;
        } else {
          diffCount += 1;
        }
      }

      adjustmentTotal += adjustmentValue(item) ?? 0;

      (
        [item.countedByName1, item.countedByName2, item.countedByName3] as const
      ).forEach((name, index) => {
        const value = [
          item.countedQuantity1,
          item.countedQuantity2,
          item.countedQuantity3,
        ][index];

        if (name && value != null) {
          userTally.set(name, (userTally.get(name) ?? 0) + 1);
        }
      });
    });
  });

  const counted = totalItems - pendingCount;
  const progressPct = totalItems > 0 ? (counted / totalItems) * 100 : 0;
  const resolved = okCount + diffCount;
  const accuracyPct = resolved > 0 ? (okCount / resolved) * 100 : null;

  const ranking = Array.from(userTally.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return {
    activeCountsTotal: activeCounts.length,
    totalItems,
    counted,
    pendingCount,
    okCount,
    diffCount,
    awaitingRecount,
    progressPct,
    accuracyPct,
    adjustmentTotal,
    ranking,
  };
}

const fieldClass = `
  h-11 w-full rounded-xl border border-[var(--border)]
  bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)]
  outline-none transition-colors focus:border-[var(--primary)]
`;

const STATUS_BADGE_CLASS: Record<InventoryCountStatus, string> = {
  DRAFT: "bg-[var(--surface-hover)] text-[var(--text-muted)]",
  OPEN: "bg-[var(--warning-soft)] text-[var(--warning)]",
  COUNTING: "bg-[var(--primary-soft)] text-[var(--primary)]",
  FINALIZED: "bg-[var(--warning-soft)] text-[var(--warning)]",
  ADJUSTED: "bg-[var(--success-soft)] text-[var(--success)]",
  CANCELLED: "bg-[var(--danger-soft)] text-[var(--danger)]",
};

const ITEM_STATUS_BADGE_CLASS: Record<InventoryCountItemStatus, string> = {
  PENDING: "bg-[var(--surface-hover)] text-[var(--text-muted)]",
  RECOUNT_2: "bg-[var(--warning-soft)] text-[var(--warning)]",
  RECOUNT_3: "bg-[var(--warning-soft)] text-[var(--warning)]",
  DONE: "bg-[var(--success-soft)] text-[var(--success)]",
};

export default function AcompanhamentoInventarioPage() {
  const { can } = useAuth();

  const [allCounts, setAllCounts] = useState<InventoryCount[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<InventoryCount | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [savingItemId, setSavingItemId] = useState("");

  const [actionId, setActionId] = useState("");
  const [actionError, setActionError] = useState("");

  const allowed = can("inventory-count-tracking.view");
  const canEditReadings = can("inventory-count-tracking.update");

  // Busca sempre tudo (sem filtro na API) — o filtro de status vira só
  // visual na tabela (useMemo abaixo), pro painel do topo continuar
  // enxergando as contagens ativas mesmo com outro filtro selecionado.
  const load = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }

    setListError("");

    try {
      const result = await inventoryCountService.list({});

      setAllCounts(result);
      setLastUpdated(new Date());
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
  }, []);

  useEffect(() => {
    if (!allowed) {
      setLoading(false);

      return;
    }

    void load();
  }, [load, allowed]);

  // "Atualização online": a tela se atualiza sozinha, sem precisar de
  // F5 — este app não tem websocket, então o jeito é reconsultar em
  // intervalo curto (mesmo padrão já usado no sino de notificações).
  useEffect(() => {
    if (!allowed) {
      return;
    }

    const interval = setInterval(() => {
      void load(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [allowed, load]);

  const [refreshing, setRefreshing] = useState(false);

  async function handleManualRefresh() {
    setRefreshing(true);

    try {
      await load(true);
    } finally {
      setRefreshing(false);
    }
  }

  const counts = useMemo(
    () =>
      statusFilter
        ? allCounts.filter((c) => c.status === statusFilter)
        : allCounts,
    [allCounts, statusFilter]
  );

  const activeCounts = useMemo(
    () =>
      allCounts.filter(
        (c) => c.status === "OPEN" || c.status === "COUNTING"
      ),
    [allCounts]
  );

  const dashboard = useMemo(
    () => computeDashboard(activeCounts),
    [activeCounts]
  );

  async function openDetail(count: InventoryCount) {
    setDetail(null);
    setDetailError("");
    setDetailOpen(true);
    setDetailLoading(true);

    try {
      const fresh = await inventoryCountService.getById(count.id);

      setDetail(fresh);
    } catch (err) {
      setDetailError(
        extractMessage(err, "Não foi possível carregar a contagem.")
      );
    } finally {
      setDetailLoading(false);
    }
  }

  const decimal = (value: string) => {
    const normalized = value.replace(/\./g, "").replace(",", ".");
    const parsed = Number(normalized);

    return Number.isFinite(parsed) ? parsed : 0;
  };

  async function saveItemReading(
    itemId: string,
    field: "countedQuantity1" | "countedQuantity2" | "countedQuantity3",
    rawValue: string
  ) {
    if (!detail || rawValue === "") {
      return;
    }

    setSavingItemId(itemId);
    setDetailError("");

    try {
      const updated = await inventoryCountService.updateItemReadings(
        detail.id,
        itemId,
        { [field]: decimal(rawValue) }
      );

      setDetail(updated);

      await load();
    } catch (err) {
      setDetailError(
        extractMessage(err, "Não foi possível salvar a leitura.")
      );
    } finally {
      setSavingItemId("");
    }
  }

  async function finalizeCount(id: string, confirmIncomplete = false) {
    if (
      !confirmIncomplete &&
      !window.confirm(
        "Finalizar esta contagem? Trava os valores contados — depois é só ajustar o estoque."
      )
    ) {
      return;
    }

    setActionId(id);
    setDetailError("");

    try {
      const updated = await inventoryCountService.finalize(id, {
        confirmIncomplete: confirmIncomplete || undefined,
      });

      setDetail(updated);

      await load();
    } catch (err) {
      const message = extractMessage(
        err,
        "Não foi possível finalizar a contagem."
      );

      if (!confirmIncomplete && message.includes("Confirma")) {
        if (window.confirm(message)) {
          return finalizeCount(id, true);
        }

        return;
      }

      setDetailError(message);
    } finally {
      setActionId("");
    }
  }

  async function adjustCount(id: string) {
    if (
      !window.confirm(
        "Ajustar o estoque agora? Gera as entradas/saídas necessárias pra bater com o que foi contado — não tem como desfazer."
      )
    ) {
      return;
    }

    setActionId(id);
    setDetailError("");

    try {
      const updated = await inventoryCountService.adjust(id);

      setDetail(updated);

      await load();
    } catch (err) {
      setDetailError(
        extractMessage(err, "Não foi possível ajustar o estoque.")
      );
    } finally {
      setActionId("");
    }
  }

  async function cancelCount(id: string) {
    if (
      !window.confirm(
        "Cancelar esta contagem? Nada é aplicado no estoque."
      )
    ) {
      return;
    }

    setActionId(id);
    setDetailError("");

    try {
      const updated = await inventoryCountService.cancel(id);

      setDetail(updated);

      await load();
    } catch (err) {
      setDetailError(
        extractMessage(err, "Não foi possível cancelar a contagem.")
      );
    } finally {
      setActionId("");
    }
  }

  async function removeCount(count: InventoryCount) {
    if (
      !window.confirm(
        `Excluir a contagem ${formatInventoryCountNumber(count.number)}? Essa ação não pode ser desfeita.`
      )
    ) {
      return;
    }

    setActionId(count.id);
    setActionError("");

    try {
      await inventoryCountService.remove(count.id);

      setDetailOpen(false);

      await load();
    } catch (err) {
      setActionError(
        extractMessage(err, "Não foi possível excluir a contagem.")
      );
    } finally {
      setActionId("");
    }
  }

  if (!allowed) {
    return (
      <AppShell workspaceLabel="Acompanhamento de inventário">
        <div className="flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--text-muted)]">
          <Lock size={18} className="mt-0.5 shrink-0" />

          <div>
            <p className="font-medium text-[var(--text-secondary)]">
              Sem acesso ao acompanhamento
            </p>

            <p className="mt-1">
              Você não tem a permissão &quot;Acompanhar Contagens de
              Inventário&quot;. Peça a um administrador para liberar
              em Perfis de acesso.
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell workspaceLabel="Acompanhamento de inventário">
      <ListPageLayout
        header={
          <>
            <header>
              <Link
                href="/erp/estoque/inventario"
                className="mb-3 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              >
                <ArrowLeft size={16} />
                Voltar para Contagem de inventário
              </Link>

              <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                Acompanhamento de inventário
              </h1>

              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Acompanhe o andamento das contagens, corrija leituras,
                finalize e ajuste o estoque.
              </p>
            </header>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  Painel geral — {dashboard.activeCountsTotal}{" "}
                  contagem(ns) em andamento (aberta ou em contagem)
                </p>

                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  <span className="flex items-center gap-1.5">
                    <RefreshCw size={12} />
                    Atualiza sozinho a cada 5s
                    {lastUpdated &&
                      ` · Últ. atualização ${lastUpdated.toLocaleTimeString("pt-BR")}`}
                  </span>

                  <button
                    type="button"
                    onClick={() => void handleManualRefresh()}
                    disabled={refreshing}
                    title="Atualizar agora"
                    aria-label="Atualizar agora"
                    className="rounded-lg border border-[var(--border)] p-1.5 text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] disabled:opacity-50"
                  >
                    <RefreshCw
                      size={14}
                      className={refreshing ? "animate-spin" : undefined}
                    />
                  </button>
                </div>
              </div>

              {dashboard.activeCountsTotal === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">
                  Nenhuma contagem em andamento no momento.
                </p>
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                    <div className="rounded-xl border border-[var(--border)] p-3">
                      <p className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)]">
                        <Package size={14} />
                        Itens a contar
                      </p>
                      <p className="mt-1 text-xl font-bold text-[var(--text-primary)]">
                        {dashboard.totalItems}
                      </p>
                    </div>

                    <div className="rounded-xl border border-[var(--border)] p-3">
                      <p className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)]">
                        <CheckCircle2 size={14} />
                        Já contados
                      </p>
                      <p className="mt-1 text-xl font-bold text-[var(--text-primary)]">
                        {dashboard.counted}
                      </p>
                    </div>

                    <div className="rounded-xl border border-[var(--border)] p-3">
                      <p className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)]">
                        <Clock size={14} />
                        Falta contar
                      </p>
                      <p className="mt-1 text-xl font-bold text-[var(--text-primary)]">
                        {dashboard.pendingCount}
                      </p>
                    </div>

                    <div className="rounded-xl border border-[var(--border)] p-3">
                      <p className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)]">
                        <RotateCcw size={14} />
                        Aguardando recontagem
                      </p>
                      <p className="mt-1 text-xl font-bold text-[var(--warning)]">
                        {dashboard.awaitingRecount}
                      </p>
                    </div>

                    <div className="rounded-xl border border-[var(--border)] p-3">
                      <p className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)]">
                        <CheckCircle2 size={14} />
                        Itens ok
                      </p>
                      <p className="mt-1 text-xl font-bold text-[var(--success)]">
                        {dashboard.okCount}
                      </p>
                    </div>

                    <div className="rounded-xl border border-[var(--border)] p-3">
                      <p className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)]">
                        <AlertTriangle size={14} />
                        Com diferença
                      </p>
                      <p className="mt-1 text-xl font-bold text-[var(--danger)]">
                        {dashboard.diffCount}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 lg:grid-cols-3">
                    <div className="rounded-xl border border-[var(--border)] p-3">
                      <p className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)]">
                        <Gauge size={14} />
                        Andamento da contagem
                      </p>

                      <p className="mt-1 text-xl font-bold text-[var(--text-primary)]">
                        {percent(dashboard.progressPct)}%
                      </p>

                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--surface-hover)]">
                        <div
                          className="h-full rounded-full bg-[var(--primary)] transition-all"
                          style={{
                            width: `${Math.min(100, dashboard.progressPct)}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="rounded-xl border border-[var(--border)] p-3">
                      <p className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)]">
                        <Target size={14} />
                        Acuracidade de estoque
                      </p>

                      <p className="mt-1 text-xl font-bold text-[var(--text-primary)]">
                        {dashboard.accuracyPct != null
                          ? `${percent(dashboard.accuracyPct)}%`
                          : "—"}
                      </p>

                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        {dashboard.accuracyPct != null
                          ? `${dashboard.okCount} de ${dashboard.okCount + dashboard.diffCount} itens já lidos bateram com o sistema`
                          : "Sem itens lidos ainda"}
                      </p>
                    </div>

                    <div className="rounded-xl border border-[var(--border)] p-3">
                      <p className="text-xs font-medium text-[var(--text-muted)]">
                        Valor do ajuste (até agora)
                      </p>

                      <p
                        className={`mt-1 text-xl font-bold ${
                          dashboard.adjustmentTotal === 0
                            ? "text-[var(--text-primary)]"
                            : dashboard.adjustmentTotal > 0
                              ? "text-[var(--success)]"
                              : "text-[var(--danger)]"
                        }`}
                      >
                        {money(dashboard.adjustmentTotal)}
                      </p>

                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        Diferença × custo médio, itens já lidos
                      </p>
                    </div>
                  </div>

                  {dashboard.ranking.length > 0 && (
                    <div className="mt-3 rounded-xl border border-[var(--border)] p-3">
                      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)]">
                        <Users size={14} />
                        Leituras por usuário (contagens em andamento)
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {dashboard.ranking.map((entry) => (
                          <span
                            key={entry.name}
                            className="rounded-full bg-[var(--surface-hover)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]"
                          >
                            {entry.name}: {entry.count}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

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
              Nenhuma contagem para acompanhar
            </p>

            <p className="mt-1 text-sm text-[var(--text-muted)]">
              As contagens abertas em &quot;Contagem de
              inventário&quot; aparecem aqui.
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
                  <th className="px-4 py-3 text-right font-semibold">
                    Itens
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Contados
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">
                    A recontar
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Com diferença
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Valor a ajustar
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>

              <tbody>
                {counts.map((c) => {
                  const items = c.items ?? [];
                  const s = summarize(items);
                  const recount = s.RECOUNT_2 + s.RECOUNT_3;

                  const withDifference = items.filter((item) => {
                    const final = finalQuantity(item);

                    return (
                      final != null &&
                      Math.abs(final - num(item.systemQuantity)) >= 0.0005
                    );
                  }).length;

                  const adjustment = countAdjustmentValue(items);

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

                      <td className="px-4 py-3 text-right text-[var(--text-secondary)]">
                        {items.length}
                      </td>

                      <td className="px-4 py-3 text-right font-medium text-[var(--success)]">
                        {s.DONE}
                      </td>

                      <td
                        className={`px-4 py-3 text-right font-medium ${recount > 0 ? "text-[var(--warning)]" : "text-[var(--text-muted)]"}`}
                      >
                        {recount}
                      </td>

                      <td
                        className={`px-4 py-3 text-right font-medium ${withDifference > 0 ? "text-[var(--danger)]" : "text-[var(--text-muted)]"}`}
                      >
                        {withDifference}
                      </td>

                      <td
                        className={`whitespace-nowrap px-4 py-3 text-right font-medium ${
                          adjustment === 0
                            ? "text-[var(--text-muted)]"
                            : adjustment > 0
                              ? "text-[var(--success)]"
                              : "text-[var(--danger)]"
                        }`}
                      >
                        {money(adjustment)}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => void openDetail(c)}
                            title="Abrir"
                            aria-label="Abrir"
                            className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                          >
                            <Eye size={16} />
                          </button>
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

      {/* Detalhe: rodadas de contagem, correção e ações */}
      {detailOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-8 w-full max-w-6xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                  {detail
                    ? formatInventoryCountNumber(detail.number)
                    : "Contagem"}
                </h2>

                {detail && (
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    {INVENTORY_COUNT_STATUS_LABELS[detail.status]} ·{" "}
                    {detail.warehouse?.code} · {detail.observation}
                    {detail.createdByName &&
                      ` · Criado por ${detail.createdByName} em ${date(detail.createdAt)}`}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setDetailOpen(false)}
                aria-label="Fechar"
                className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)]"
              >
                <X size={18} />
              </button>
            </div>

            {detailLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-12 animate-pulse rounded-xl bg-[var(--surface-hover)]"
                  />
                ))}
              </div>
            ) : detail ? (
              <>
                {(() => {
                  const s = summarize(detail.items);
                  const recount = s.RECOUNT_2 + s.RECOUNT_3;
                  const adjustment = countAdjustmentValue(detail.items);

                  return (
                    <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-medium">
                      <span className="rounded-full bg-[var(--success-soft)] px-3 py-1 text-[var(--success)]">
                        {s.DONE} finalizado(s)
                      </span>

                      {recount > 0 && (
                        <span className="rounded-full bg-[var(--warning-soft)] px-3 py-1 text-[var(--warning)]">
                          {recount} aguardando recontagem
                        </span>
                      )}

                      {s.PENDING > 0 && (
                        <span className="rounded-full bg-[var(--surface-hover)] px-3 py-1 text-[var(--text-muted)]">
                          {s.PENDING} sem contagem
                        </span>
                      )}

                      <span
                        className={`rounded-full px-3 py-1 ${
                          adjustment === 0
                            ? "bg-[var(--surface-hover)] text-[var(--text-muted)]"
                            : adjustment > 0
                              ? "bg-[var(--success-soft)] text-[var(--success)]"
                              : "bg-[var(--danger-soft)] text-[var(--danger)]"
                        }`}
                      >
                        Valor do ajuste: {money(adjustment)}
                      </span>
                    </div>
                  );
                })()}

                <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[var(--surface-hover)] text-[var(--text-secondary)]">
                      <tr>
                        <th className="px-3 py-2 font-semibold">
                          Produto
                        </th>
                        <th className="px-3 py-2 text-right font-semibold">
                          Saldo sistema
                        </th>
                        <th className="px-3 py-2 text-right font-semibold">
                          Contagem 1
                        </th>
                        <th className="px-3 py-2 text-right font-semibold">
                          Contagem 2
                        </th>
                        <th className="px-3 py-2 text-right font-semibold">
                          Contagem 3
                        </th>
                        <th className="px-3 py-2 text-right font-semibold">
                          Diferença
                        </th>
                        <th className="px-3 py-2 text-right font-semibold">
                          Valor (R$)
                        </th>
                        <th className="px-3 py-2 font-semibold">
                          Status
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {detail.items.map((item) => {
                        const final = finalQuantity(item);
                        const diff =
                          final != null
                            ? final - num(item.systemQuantity)
                            : null;
                        const adjustedValue = adjustmentValue(item);

                        const locked =
                          detail.status === "ADJUSTED" ||
                          detail.status === "CANCELLED";

                        return (
                          <tr
                            key={item.id}
                            className="border-t border-[var(--border)]"
                          >
                            <td className="px-3 py-2">
                              <p className="text-[var(--text-primary)]">
                                {item.product
                                  ? `${item.product.code} — ${item.product.description}`
                                  : "—"}
                              </p>

                              {item.addedDuringCount && (
                                <p className="text-xs text-[var(--warning)]">
                                  Achado durante a contagem (fora da
                                  lista de abertura)
                                </p>
                              )}

                              {item.reservedQuantity != null &&
                                num(item.reservedQuantity) > 0 && (
                                  <p className="text-xs text-[var(--text-muted)]">
                                    Reservado: {qty(item.reservedQuantity)}
                                  </p>
                                )}
                            </td>

                            <td className="whitespace-nowrap px-3 py-2 text-right text-[var(--text-secondary)]">
                              {qty(item.systemQuantity)}
                            </td>

                            {(
                              [
                                [
                                  "countedQuantity1",
                                  item.countedQuantity1,
                                  item.countedByName1,
                                ],
                                [
                                  "countedQuantity2",
                                  item.countedQuantity2,
                                  item.countedByName2,
                                ],
                                [
                                  "countedQuantity3",
                                  item.countedQuantity3,
                                  item.countedByName3,
                                ],
                              ] as const
                            ).map(([field, value, byName]) => (
                              <td
                                key={field}
                                className="whitespace-nowrap px-3 py-2 text-right"
                              >
                                {canEditReadings && !locked ? (
                                  <input
                                    inputMode="decimal"
                                    defaultValue={
                                      value != null ? qty(value) : ""
                                    }
                                    disabled={savingItemId === item.id}
                                    onBlur={(e) =>
                                      void saveItemReading(
                                        item.id,
                                        field,
                                        e.target.value
                                      )
                                    }
                                    className="h-9 w-24 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-right text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)] disabled:opacity-60"
                                  />
                                ) : (
                                  <span className="text-[var(--text-secondary)]">
                                    {value != null ? qty(value) : "—"}
                                  </span>
                                )}

                                {byName && (
                                  <p className="text-xs text-[var(--text-muted)]">
                                    {byName}
                                  </p>
                                )}
                              </td>
                            ))}

                            <td className="whitespace-nowrap px-3 py-2 text-right">
                              {diff != null ? (
                                <span
                                  className={
                                    diff === 0
                                      ? "text-[var(--text-secondary)]"
                                      : diff > 0
                                        ? "text-[var(--success)]"
                                        : "text-[var(--danger)]"
                                  }
                                >
                                  {diff > 0 ? "+" : ""}
                                  {qty(diff)}
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>

                            <td className="whitespace-nowrap px-3 py-2 text-right">
                              {adjustedValue != null ? (
                                <span
                                  className={
                                    adjustedValue === 0
                                      ? "text-[var(--text-secondary)]"
                                      : adjustedValue > 0
                                        ? "text-[var(--success)]"
                                        : "text-[var(--danger)]"
                                  }
                                >
                                  {money(adjustedValue)}
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>

                            <td className="whitespace-nowrap px-3 py-2">
                              <span
                                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${ITEM_STATUS_BADGE_CLASS[item.status]}`}
                              >
                                {
                                  INVENTORY_COUNT_ITEM_STATUS_LABELS[
                                    item.status
                                  ]
                                }
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {canEditReadings &&
                  detail.status !== "ADJUSTED" &&
                  detail.status !== "CANCELLED" && (
                    <p className="mt-2 text-xs text-[var(--text-muted)]">
                      As quantidades das contagens são editáveis — o
                      valor é salvo ao sair do campo.
                    </p>
                  )}

                {detailError && (
                  <div className="mt-4 rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                    {detailError}
                  </div>
                )}

                <div className="mt-6 flex flex-wrap justify-between gap-3">
                  <div className="flex flex-wrap gap-3">
                    {(detail.status === "OPEN" ||
                      detail.status === "COUNTING") && (
                      <Can permission="inventory-count.approve">
                        <button
                          type="button"
                          disabled={actionId === detail.id}
                          onClick={() => void finalizeCount(detail.id)}
                          className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] disabled:opacity-60"
                        >
                          <Check size={16} />
                          Finalizar
                        </button>
                      </Can>
                    )}

                    {detail.status === "FINALIZED" && (
                      <Can permission="inventory-count.approve">
                        <button
                          type="button"
                          disabled={actionId === detail.id}
                          onClick={() => void adjustCount(detail.id)}
                          className="flex items-center gap-2 rounded-xl bg-[var(--success)] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                        >
                          <RefreshCw size={16} />
                          Ajustar estoque
                        </button>
                      </Can>
                    )}

                    {(detail.status === "OPEN" ||
                      detail.status === "COUNTING" ||
                      detail.status === "FINALIZED") && (
                      <Can permission="inventory-count.cancel">
                        <button
                          type="button"
                          disabled={actionId === detail.id}
                          onClick={() => void cancelCount(detail.id)}
                          className="rounded-xl border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--danger)] hover:text-[var(--danger)] disabled:opacity-60"
                        >
                          Cancelar contagem
                        </button>
                      </Can>
                    )}

                    {detail.status === "CANCELLED" && (
                      <Can permission="inventory-count.delete">
                        <button
                          type="button"
                          disabled={actionId === detail.id}
                          onClick={() => void removeCount(detail)}
                          className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--danger)] hover:text-[var(--danger)] disabled:opacity-60"
                        >
                          <Trash2 size={16} />
                          Excluir
                        </button>
                      </Can>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setDetailOpen(false)}
                    className="rounded-xl border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--text-secondary)]"
                  >
                    Fechar
                  </button>
                </div>
              </>
            ) : (
              detailError && (
                <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                  {detailError}
                </div>
              )
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
