"use client";

import { ReportAccessGuard } from "@/components/reports/ReportAccessGuard";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Printer } from "lucide-react";

import {
  PRODUCT_TYPE_LABELS,
  brandService,
  categoryService,
  productService,
  type AuxiliaryRecord,
  type Product,
  type ProductType,
} from "@/services/product.service";
import { inventoryService } from "@/services/inventory.service";
import { companyService } from "@/services/company.service";
import { exportCsv } from "@/lib/exportCsv";

const STATUS_LABELS: Record<"ACTIVE" | "INACTIVE", string> = {
  ACTIVE: "Ativo",
  INACTIVE: "Inativo",
};

function money(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

const fieldClass = `
  h-11 w-full rounded-xl border border-[var(--border)]
  bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)]
  outline-none transition-colors focus:border-[var(--primary)]
`;

const labelClass =
  "mb-1 block text-sm font-medium text-[var(--text-secondary)]";

function RelatorioProdutosPageInner() {
  const [categories, setCategories] = useState<
    AuxiliaryRecord[]
  >([]);
  const [brands, setBrands] = useState<AuxiliaryRecord[]>([]);
  const [companyName, setCompanyName] = useState("");

  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [type, setType] = useState<ProductType | "">("");
  const [status, setStatus] = useState<
    "ACTIVE" | "INACTIVE" | ""
  >("");

  const [products, setProducts] = useState<Product[]>([]);
  const [avgCostByProduct, setAvgCostByProduct] = useState<
    Record<string, number>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    categoryService
      .list()
      .then((r) => setCategories(r.data ?? []))
      .catch(() => {});

    brandService
      .list()
      .then((r) => setBrands(r.data ?? []))
      .catch(() => {});

    companyService
      .getMine()
      .then((c) =>
        setCompanyName(c.tradeName || c.legalName || "")
      )
      .catch(() => {});

    // Custo médio é por produto+depósito — pra mostrar 1 valor por
    // produto no relatório, pondera pela quantidade em cada depósito.
    inventoryService
      .list({ limit: 10000 })
      .then((result) => {
        const totals: Record<
          string,
          { costQty: number; qty: number }
        > = {};

        for (const item of result.data) {
          const qty = Number(item.quantity ?? 0);
          const cost = Number(item.averageCost ?? 0);
          const entry = totals[item.productId] ?? {
            costQty: 0,
            qty: 0,
          };

          entry.costQty += qty * cost;
          entry.qty += qty;
          totals[item.productId] = entry;
        }

        const averages: Record<string, number> = {};

        for (const [productId, t] of Object.entries(
          totals
        )) {
          averages[productId] = t.qty > 0 ? t.costQty / t.qty : 0;
        }

        setAvgCostByProduct(averages);
      })
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await productService.list({
        search: search || undefined,
        categoryId: categoryId || undefined,
        brandId: brandId || undefined,
        type: type || undefined,
        status: status || undefined,
        limit: 10000,
      });

      setProducts(result.data);
    } catch (err) {
      setError("Não foi possível carregar os produtos.");
      void err;
    } finally {
      setLoading(false);
    }
  }, [search, categoryId, brandId, type, status]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 300);

    return () => clearTimeout(timer);
  }, [load]);

  function handleExport() {
    exportCsv(
      "relatorio-produtos",
      [
        "Código",
        "REF",
        "Descrição",
        "Categoria",
        "Marca",
        "Unidade",
        "Custo médio",
        "Situação",
        "Criado por",
        "Alterado por",
      ],
      products.map((p) => [
        p.code,
        p.reference ?? "",
        p.description,
        p.category?.name ?? "",
        p.brand?.name ?? "",
        p.unit?.code ?? "",
        money(avgCostByProduct[p.id] ?? 0),
        STATUS_LABELS[p.status],
        p.createdByName || "",
        p.updatedByName || "",
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
          href="/erp/produtos"
          className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={16} />
          Voltar
        </Link>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={products.length === 0}
            className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] disabled:opacity-50"
          >
            <Download size={18} />
            Exportar CSV
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            disabled={products.length === 0}
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

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className={labelClass}>Buscar</label>

            <input
              className={fieldClass}
              placeholder="Código, descrição, REF..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass}>Categoria</label>

            <select
              className={fieldClass}
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">Todas</option>

              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Marca</label>

            <select
              className={fieldClass}
              value={brandId}
              onChange={(e) => setBrandId(e.target.value)}
            >
              <option value="">Todas</option>

              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Tipo</label>

            <select
              className={fieldClass}
              value={type}
              onChange={(e) =>
                setType(e.target.value as ProductType | "")
              }
            >
              <option value="">Todos</option>

              {Object.entries(PRODUCT_TYPE_LABELS).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label className={labelClass}>Situação</label>

            <select
              className={fieldClass}
              value={status}
              onChange={(e) =>
                setStatus(
                  e.target.value as "ACTIVE" | "INACTIVE" | ""
                )
              }
            >
              <option value="">Todas</option>
              <option value="ACTIVE">Ativo</option>
              <option value="INACTIVE">Inativo</option>
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <h1 className="text-xl font-bold text-[var(--text-primary)] print:text-black">
          Relatório de Produtos
        </h1>

        <p className="text-sm text-[var(--text-muted)] print:text-black">
          {companyName} — gerado em {today} —{" "}
          {products.length}{" "}
          {products.length === 1
            ? "produto"
            : "produtos"}
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
                Código
              </th>
              <th className="px-3 py-2 font-semibold print:border print:border-black">
                REF
              </th>
              <th className="px-3 py-2 font-semibold print:border print:border-black">
                Descrição
              </th>
              <th className="px-3 py-2 font-semibold print:border print:border-black">
                Categoria
              </th>
              <th className="px-3 py-2 font-semibold print:border print:border-black">
                Marca
              </th>
              <th className="px-3 py-2 font-semibold print:border print:border-black">
                Un.
              </th>
              <th className="px-3 py-2 text-right font-semibold print:border print:border-black">
                Custo médio
              </th>
              <th className="px-3 py-2 font-semibold print:border print:border-black">
                Situação
              </th>
              <th className="px-3 py-2 font-semibold print:border print:border-black">
                Criado por
              </th>
              <th className="px-3 py-2 font-semibold print:border print:border-black">
                Alterado por
              </th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={10}
                  className="px-3 py-6 text-center text-[var(--text-muted)]"
                >
                  Carregando...
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  className="px-3 py-6 text-center text-[var(--text-muted)]"
                >
                  Nenhum produto encontrado com esses filtros.
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr
                  key={p.id}
                  className="border-t border-[var(--border)] print:border-black"
                >
                  <td className="px-3 py-2 text-[var(--text-secondary)] print:border print:border-black print:text-black">
                    {p.code}
                  </td>
                  <td className="px-3 py-2 text-[var(--text-secondary)] print:border print:border-black print:text-black">
                    {p.reference || "—"}
                  </td>
                  <td className="px-3 py-2 font-medium text-[var(--text-primary)] print:border print:border-black print:text-black">
                    {p.description}
                  </td>
                  <td className="px-3 py-2 text-[var(--text-secondary)] print:border print:border-black print:text-black">
                    {p.category?.name ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-[var(--text-secondary)] print:border print:border-black print:text-black">
                    {p.brand?.name ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-[var(--text-secondary)] print:border print:border-black print:text-black">
                    {p.unit?.code ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-right text-[var(--text-secondary)] print:border print:border-black print:text-black">
                    {money(avgCostByProduct[p.id] ?? 0)}
                  </td>
                  <td className="px-3 py-2 text-[var(--text-secondary)] print:border print:border-black print:text-black">
                    {STATUS_LABELS[p.status]}
                  </td>
                  <td className="px-3 py-2 text-[var(--text-secondary)] print:border print:border-black print:text-black">
                    {p.createdByName || "—"}
                  </td>
                  <td className="px-3 py-2 text-[var(--text-secondary)] print:border print:border-black print:text-black">
                    {p.updatedByName || "—"}
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

export default function RelatorioProdutosPage() {
  return (
    <ReportAccessGuard permission="product.report">
      <RelatorioProdutosPageInner />
    </ReportAccessGuard>
  );
}
