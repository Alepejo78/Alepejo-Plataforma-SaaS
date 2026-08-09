"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AppShell } from "@/components";
import { ListPageLayout } from "@/components/layout/ListPageLayout";

import {
  MOVEMENT_LABELS,
  stockMovementService,
  type StockMovement,
  type StockMovementType,
} from "@/services/inventory.service";

const TIPOS: {
  label: string;
  value?: StockMovementType;
}[] = [
  { label: "Todas" },
  { label: "Entradas", value: "ENTRY" },
  { label: "Saídas", value: "EXIT" },
  { label: "Ajustes", value: "ADJUSTMENT" },
  { label: "Bloqueios", value: "HOLD" },
  { label: "Liberações", value: "RELEASE" },
];

function qty(value: string | number | null | undefined) {
  return Number(value ?? 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}

function money(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return "—";
  }

  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function dateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function badgeClass(type: StockMovementType) {
  if (type === "ENTRY") {
    return "bg-[var(--success-soft)] text-[var(--success)]";
  }

  if (type === "EXIT") {
    return "bg-[var(--danger-soft)] text-[var(--danger)]";
  }

  if (type === "HOLD") {
    return "bg-[var(--warning-soft)] text-[var(--warning)]";
  }

  if (type === "RELEASE") {
    return "bg-[var(--success-soft)] text-[var(--success)]";
  }

  return "bg-[var(--primary-soft)] text-[var(--primary-text)]";
}

export default function MovimentacoesPage() {
  const [items, setItems] = useState<StockMovement[]>([]);
  const [type, setType] = useState<
    StockMovementType | undefined
  >();
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await stockMovementService.list({
        type,
        search: search || undefined,
      });

      setItems(result);
    } catch {
      setError(
        "Não foi possível carregar as movimentações."
      );
    } finally {
      setLoading(false);
    }
  }, [type, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 300);

    return () => clearTimeout(timer);
  }, [load]);

  return (
    <AppShell workspaceLabel="Movimentações">
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

              <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                Movimentações
              </h1>

              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Histórico de entradas, saídas e ajustes de
                estoque.
              </p>
            </header>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-wrap gap-2">
                {TIPOS.map((item) => {
                  const active = type === item.value;

                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => setType(item.value)}
                      className={`
                        rounded-xl border px-3 py-2 text-sm font-medium transition-colors
                        ${
                          active
                            ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary-text)]"
                            : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                        }
                      `}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>

              <input
                placeholder="Buscar por produto"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-11 min-w-64 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--primary)]"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                {error}
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
              Nenhuma movimentação registrada
            </p>

            <p className="mt-1 text-sm text-[var(--text-muted)]">
              As entradas e saídas feitas no estoque
              aparecem aqui.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-[var(--surface-hover)] text-[var(--text-secondary)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">
                    Data
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Tipo
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Produto
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Depósito
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Quantidade
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Custo un.
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Documento
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Observação
                  </th>
                </tr>
              </thead>

              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-t border-[var(--border)]"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-[var(--text-secondary)]">
                      {dateTime(item.createdAt)}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`whitespace-nowrap rounded px-2 py-1 text-xs font-medium ${badgeClass(item.type)}`}
                      >
                        {MOVEMENT_LABELS[item.type]}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <p className="font-medium text-[var(--text-primary)]">
                        {item.inventory?.product
                          ?.description ?? "—"}
                      </p>

                      <p className="text-xs text-[var(--text-muted)]">
                        {item.inventory?.product?.code}
                      </p>
                    </td>

                    <td className="px-4 py-3 text-[var(--text-secondary)]">
                      {item.inventory?.warehouse?.code ??
                        "—"}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-[var(--text-primary)]">
                      {qty(item.quantity)}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-right text-[var(--text-secondary)]">
                      {money(item.unitCost)}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 font-medium text-[var(--text-primary)]">
                      {item.documentNumber || "—"}
                    </td>

                    <td className="px-4 py-3 text-[var(--text-muted)]">
                      {item.observation || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ListPageLayout>
    </AppShell>
  );
}
