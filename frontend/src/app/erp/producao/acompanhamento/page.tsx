"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Printer } from "lucide-react";

import { SearchSelect } from "@/components/ui/SearchSelect";
import { companyService } from "@/services/company.service";
import { exportCsv } from "@/lib/exportCsv";

import {
  PRODUCTION_ORDER_ORIGIN_LABELS,
  PRODUCTION_ORDER_STATUS_LABELS,
  formatProductionOrderNumber,
  productionOrderService,
  type ProductionOrder,
  type ProductionOrderOrigin,
  type ProductionOrderStatus,
} from "@/services/production.service";

import {
  productService,
  type Product,
} from "@/services/product.service";

function date(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
  });
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

/** Diferença em dias entre duas datas "AAAA-MM-DD", em UTC (sem hora). */
function daysBetween(fromIsoDate: string, toIsoDate: string) {
  const [fy, fm, fd] = fromIsoDate.split("-").map(Number);
  const [ty, tm, td] = toIsoDate.split("-").map(Number);

  const fromMs = Date.UTC(fy, fm - 1, fd);
  const toMs = Date.UTC(ty, tm - 1, td);

  return Math.round((toMs - fromMs) / 86400000);
}

function forecastLabel(order: ProductionOrder) {
  if (
    order.status === "FINALIZADA" ||
    order.status === "CANCELADA" ||
    !order.expectedDate
  ) {
    return "—";
  }

  const diff = daysBetween(
    todayIsoDate(),
    order.expectedDate.slice(0, 10)
  );

  if (diff < 0) {
    return `${Math.abs(diff)} dia(s) de atraso`;
  }

  if (diff === 0) {
    return "Vence hoje";
  }

  return `${diff} dia(s) restante(s)`;
}

function forecastCsvValue(order: ProductionOrder) {
  if (
    order.status === "FINALIZADA" ||
    order.status === "CANCELADA" ||
    !order.expectedDate
  ) {
    return "";
  }

  return String(
    daysBetween(todayIsoDate(), order.expectedDate.slice(0, 10))
  );
}

const fieldClass = `
  h-11 w-full rounded-xl border border-[var(--border)]
  bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)]
  outline-none transition-colors focus:border-[var(--primary)]
`;

const labelClass =
  "mb-1 block text-sm font-medium text-[var(--text-secondary)]";

export default function AcompanhamentoProducaoPage() {
  const [companyName, setCompanyName] = useState("");

  const [status, setStatus] = useState<
    ProductionOrderStatus | ""
  >("");
  const [origin, setOrigin] = useState<
    ProductionOrderOrigin | ""
  >("");
  const [productId, setProductId] = useState("");
  const [productLabel, setProductLabel] = useState("");

  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    companyService
      .getMine()
      .then((c) => setCompanyName(c.tradeName || c.legalName || ""))
      .catch(() => {});
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
    setError("");

    try {
      const result = await productionOrderService.list({
        status: status || undefined,
        origin: origin || undefined,
        productId: productId || undefined,
      });

      setOrders(result);
    } catch (err) {
      setError("Não foi possível carregar as ordens de produção.");
      void err;
    } finally {
      setLoading(false);
    }
  }, [status, origin, productId]);

  useEffect(() => {
    void load();
  }, [load]);

  function handleExport() {
    exportCsv(
      "acompanhamento-producao",
      [
        "Número",
        "Produto",
        "Depósito",
        "Origem",
        "Data de abertura",
        "Dias de produção",
        "Previsão",
        "Etapa atual",
        "Dias até a previsão (negativo = atraso)",
        "Finalizado em",
        "Observação de conclusão",
      ],
      orders.map((o) => [
        formatProductionOrderNumber(o.number),
        o.product
          ? `${o.product.code} — ${o.product.description}`
          : "",
        o.warehouse?.code ?? "",
        PRODUCTION_ORDER_ORIGIN_LABELS[o.origin],
        date(o.orderDate),
        o.productionDays,
        date(o.expectedDate),
        PRODUCTION_ORDER_STATUS_LABELS[o.status],
        forecastCsvValue(o),
        date(o.completedAt),
        o.completionObservation ?? "",
      ])
    );
  }

  const today = new Date().toLocaleDateString("pt-BR");

  return (
    <div className="mx-auto max-w-6xl p-6 print:max-w-none print:p-0">
      <style>{`
        @media print {
          @page { size: landscape; margin: 12mm; }
        }
      `}</style>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href="/erp/producao/ordens"
          className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={16} />
          Voltar
        </Link>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={orders.length === 0}
            className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] disabled:opacity-50"
          >
            <Download size={18} />
            Exportar CSV
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            disabled={orders.length === 0}
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-50"
          >
            <Printer size={18} />
            Imprimir
          </button>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-[var(--border)] p-4 print:hidden">
        <p className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
          Filtros
        </p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className={labelClass}>Produto</label>

            <SearchSelect<Product>
              displayLabel={productLabel}
              search={searchProducts}
              getId={(p) => p.id}
              getLabel={(p) => `${p.code} — ${p.description}`}
              placeholder="Todos os produtos"
              onSelect={(p) => {
                setProductId(p?.id ?? "");
                setProductLabel(
                  p ? `${p.code} — ${p.description}` : ""
                );
              }}
            />
          </div>

          <div>
            <label className={labelClass}>Etapa</label>

            <select
              className={fieldClass}
              value={status}
              onChange={(e) =>
                setStatus(
                  e.target.value as ProductionOrderStatus | ""
                )
              }
            >
              <option value="">Todas</option>

              {Object.entries(PRODUCTION_ORDER_STATUS_LABELS).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label className={labelClass}>Origem</label>

            <select
              className={fieldClass}
              value={origin}
              onChange={(e) =>
                setOrigin(
                  e.target.value as ProductionOrderOrigin | ""
                )
              }
            >
              <option value="">Todas</option>

              {Object.entries(PRODUCTION_ORDER_ORIGIN_LABELS).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                )
              )}
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <h1 className="text-xl font-bold text-[var(--text-primary)] print:text-black">
          Acompanhamento da Produção
        </h1>

        <p className="text-sm text-[var(--text-muted)] print:text-black">
          {companyName} — gerado em {today} — {orders.length}{" "}
          {orders.length === 1 ? "ordem" : "ordens"}
        </p>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)] print:hidden">
          {error}
        </div>
      )}

      <div className="mt-4 overflow-x-auto rounded-2xl border border-[var(--border)] print:rounded-none print:border-black">
        <table className="w-full text-left text-sm print:text-xs">
          <thead className="bg-[var(--surface-hover)] text-[var(--text-secondary)] print:bg-transparent print:text-black">
            <tr>
              <th className="px-3 py-2 font-semibold print:border print:border-black">
                Número
              </th>
              <th className="px-3 py-2 font-semibold print:border print:border-black">
                Produto
              </th>
              <th className="px-3 py-2 font-semibold print:border print:border-black">
                Depósito
              </th>
              <th className="px-3 py-2 font-semibold print:border print:border-black">
                Origem
              </th>
              <th className="px-3 py-2 font-semibold print:border print:border-black">
                Abertura
              </th>
              <th className="px-3 py-2 text-right font-semibold print:border print:border-black">
                Dias
              </th>
              <th className="px-3 py-2 font-semibold print:border print:border-black">
                Previsão
              </th>
              <th className="px-3 py-2 font-semibold print:border print:border-black">
                Etapa
              </th>
              <th className="px-3 py-2 font-semibold print:border print:border-black">
                Previsão x hoje
              </th>
              <th className="px-3 py-2 font-semibold print:border print:border-black">
                Finalizado em
              </th>
              <th className="px-3 py-2 font-semibold print:border print:border-black">
                Observação de conclusão
              </th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={11}
                  className="px-3 py-6 text-center text-[var(--text-muted)]"
                >
                  Carregando...
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td
                  colSpan={11}
                  className="px-3 py-6 text-center text-[var(--text-muted)]"
                >
                  Nenhuma ordem de produção encontrada com esses
                  filtros.
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr
                  key={o.id}
                  className="border-t border-[var(--border)] print:border-black"
                >
                  <td className="whitespace-nowrap px-3 py-2 font-medium text-[var(--text-primary)] print:border print:border-black print:text-black">
                    {formatProductionOrderNumber(o.number)}
                  </td>
                  <td className="px-3 py-2 text-[var(--text-secondary)] print:border print:border-black print:text-black">
                    {o.product?.description ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-[var(--text-secondary)] print:border print:border-black print:text-black">
                    {o.warehouse?.code ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-[var(--text-secondary)] print:border print:border-black print:text-black">
                    {PRODUCTION_ORDER_ORIGIN_LABELS[o.origin]}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-[var(--text-secondary)] print:border print:border-black print:text-black">
                    {date(o.orderDate)}
                  </td>
                  <td className="px-3 py-2 text-right text-[var(--text-secondary)] print:border print:border-black print:text-black">
                    {o.productionDays}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-[var(--text-secondary)] print:border print:border-black print:text-black">
                    {date(o.expectedDate)}
                  </td>
                  <td className="px-3 py-2 text-[var(--text-secondary)] print:border print:border-black print:text-black">
                    {PRODUCTION_ORDER_STATUS_LABELS[o.status]}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-[var(--text-secondary)] print:border print:border-black print:text-black">
                    {forecastLabel(o)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-[var(--text-secondary)] print:border print:border-black print:text-black">
                    {date(o.completedAt)}
                  </td>
                  <td className="px-3 py-2 text-[var(--text-secondary)] print:border print:border-black print:text-black">
                    {o.completionObservation ?? "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
