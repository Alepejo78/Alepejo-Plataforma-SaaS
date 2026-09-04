"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  FileText,
  Pencil,
  Plus,
  Settings2,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import Link from "next/link";

import { AppShell } from "@/components";
import { Can } from "@/components/auth/Can";
import { ListPageLayout } from "@/components/layout/ListPageLayout";
import { ExportButton } from "@/components/ui/ExportButton";
import { ProductForm } from "@/components/products/ProductForm";
import { ProductImportModal } from "@/components/product-import/ProductImportModal";

import {
  PRODUCT_TYPE_LABELS,
  brandService,
  categoryService,
  productService,
  unitService,
  type AuxiliaryRecord,
  type InventoryControl,
  type Product,
  type UnitOfMeasure,
} from "@/services/product.service";

const INVENTORY_CONTROL_SHORT_LABELS: Record<
  InventoryControl,
  string
> = {
  NONE: "Sem estoque",
  SIMPLE: "Simples",
  BATCH: "Por lote",
  SERIAL: "Por série",
};

function decimalDisplay(
  value: string | number | null | undefined,
  suffix: string
) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed === 0) {
    return "—";
  }

  return `${parsed.toLocaleString("pt-BR", {
    maximumFractionDigits: 4,
  })} ${suffix}`;
}

function money(value: string | number | null | undefined) {
  const parsed = Number(value ?? 0);

  return parsed.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
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

export default function ProdutosPage() {
  const exportTableRef = useRef<HTMLTableElement>(null);
  const [products, setProducts] = useState<Product[]>([]);

  const [categories, setCategories] = useState<
    AuxiliaryRecord[]
  >([]);
  const [brands, setBrands] = useState<AuxiliaryRecord[]>(
    []
  );
  const [units, setUnits] = useState<UnitOfMeasure[]>([]);

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(
    null
  );
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Categorias, marcas e unidades alimentam os selects do
  // formulário: carregadas uma vez, não a cada busca.
  useEffect(() => {
    Promise.all([
      categoryService.list(),
      brandService.list(),
      unitService.list(),
    ])
      .then(([cat, brd, unt]) => {
        setCategories(cat.data ?? []);
        setBrands(brd.data ?? []);
        setUnits(unt.data ?? []);
      })
      .catch(() => {
        setListError(
          "Não foi possível carregar categorias, marcas e unidades."
        );
      });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setListError("");

    try {
      const result = await productService.list({
        search: search || undefined,
      });

      setProducts(result.data);
    } catch (err) {
      setListError(
        extractMessage(
          err,
          "Não foi possível carregar os produtos."
        )
      );
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 300);

    return () => clearTimeout(timer);
  }, [load]);

  function openCreate() {
    setEditing(null);
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(product: Product) {
    setEditing(product);
    setFormError("");
    setModalOpen(true);
  }

  async function handleSubmit(
    payload: Record<string, unknown>
  ) {
    setSaving(true);
    setFormError("");

    try {
      if (editing) {
        await productService.update(editing.id, payload);
      } else {
        await productService.create(payload);
      }

      setModalOpen(false);

      await load();
    } catch (err) {
      setFormError(
        extractMessage(
          err,
          "Não foi possível salvar o produto."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(product: Product) {
    const confirmed = window.confirm(
      `Excluir o produto ${product.description}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      await productService.remove(product.id);

      await load();
    } catch (err) {
      setListError(
        extractMessage(
          err,
          "Não foi possível excluir o produto."
        )
      );
    }
  }

  const missingUnits = units.length === 0;

  return (
    <AppShell workspaceLabel="Produtos">
      <ListPageLayout
        header={
          <>
            <header className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                  Produtos
                </h1>

                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Produtos e serviços disponíveis para venda
                  e compra.
                </p>
              </div>

              <div className="flex gap-2">
                <ExportButton
                  tableRef={exportTableRef}
                  filename="produtos"
                  sheetName="Produtos"
                />

                <Link
                  href="/erp/produtos/relatorio"
                  target="_blank"
                  className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                >
                  <FileText size={18} />
                  Relatório
                </Link>

                <Link
                  href="/erp/produtos/cadastros"
                  className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                >
                  <Settings2 size={18} />
                  Categorias, marcas e unidades
                </Link>

                <Can permission="product.create">
                  <button
                    type="button"
                    onClick={() => setImportOpen(true)}
                    className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                  >
                    <Upload size={18} />
                    Importar planilha
                  </button>

                  <button
                    type="button"
                    onClick={openCreate}
                    disabled={missingUnits}
                    title={
                      missingUnits
                        ? "Cadastre ao menos uma unidade de medida primeiro"
                        : undefined
                    }
                    className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-50"
                  >
                    <Plus size={18} />
                    Novo produto
                  </button>
                </Can>
              </div>
            </header>

            {missingUnits && (
              <div className="rounded-xl border border-[var(--warning)] bg-[var(--warning-soft)] p-3 text-sm text-[var(--warning)]">
                Cadastre ao menos uma unidade de medida (UN,
                KG, CX...) antes de criar produtos — ela é
                obrigatória.
              </div>
            )}

            <input
              placeholder="Buscar por código, descrição ou código de barras"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--primary)]"
            />

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
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="h-14 animate-pulse rounded-xl bg-[var(--surface-hover)]"
              />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-medium text-[var(--text-primary)]">
              Nenhum produto encontrado
            </p>

            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Cadastre produtos para poder lançar vendas e
              compras.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table ref={exportTableRef} className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-[var(--surface-hover)] text-[var(--text-secondary)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">
                    Código
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Descrição
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Un.
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Tipo
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Controle
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Peso
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Cubagem
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Venda
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>

              <tbody>
                {products.map((product) => (
                  <tr
                    key={product.id}
                    className="border-t border-[var(--border)]"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-[var(--text-secondary)]">
                      {product.code}
                    </td>

                    <td className="px-4 py-3">
                      <p className="font-medium text-[var(--text-primary)]">
                        {product.description}
                      </p>

                      {(product.category || product.brand) && (
                        <p className="text-xs text-[var(--text-muted)]">
                          {[
                            product.category?.name,
                            product.brand?.name,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-3 text-[var(--text-secondary)]">
                      {product.unit?.code ?? "—"}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-[var(--text-secondary)]">
                      {PRODUCT_TYPE_LABELS[product.type]}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-[var(--text-secondary)]">
                      {INVENTORY_CONTROL_SHORT_LABELS[
                        product.inventoryControl
                      ]}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-right text-[var(--text-secondary)]">
                      {decimalDisplay(product.weightKg, "kg")}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-right text-[var(--text-secondary)]">
                      {decimalDisplay(product.cubageM3, "m³")}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-[var(--text-primary)]">
                      {money(product.salePrice)}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Can permission="product.update">
                          <button
                            type="button"
                            onClick={() => openEdit(product)}
                            aria-label="Editar"
                            className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                          >
                            <Pencil size={16} />
                          </button>
                        </Can>

                        <Can permission="product.delete">
                          <button
                            type="button"
                            onClick={() =>
                              void handleRemove(product)
                            }
                            aria-label="Excluir"
                            className="rounded-lg border border-[var(--border)] p-2 text-[var(--danger)] transition-colors hover:border-[var(--danger)] hover:bg-[var(--danger-soft)]"
                          >
                            <Trash2 size={16} />
                          </button>
                        </Can>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ListPageLayout>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-8 w-full max-w-4xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                  {editing
                    ? "Editar produto"
                    : "Novo produto"}
                </h2>

                {editing &&
                  (editing.createdByName ||
                    editing.updatedByName) && (
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      {[
                        editing.createdByName &&
                          `Criado por ${editing.createdByName} em ${date(editing.createdAt)}`,
                        editing.updatedByName &&
                          editing.updatedByName !==
                            editing.createdByName &&
                          `Última alteração por ${editing.updatedByName}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Fechar"
                className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)]"
              >
                <X size={18} />
              </button>
            </div>

            <ProductForm
              product={editing}
              categories={categories}
              brands={brands}
              units={units}
              saving={saving}
              error={formError}
              onSubmit={handleSubmit}
              onCancel={() => setModalOpen(false)}
            />
          </div>
        </div>
      )}

      {importOpen && (
        <ProductImportModal
          onClose={() => setImportOpen(false)}
          onSaved={() => void load()}
        />
      )}
    </AppShell>
  );
}
