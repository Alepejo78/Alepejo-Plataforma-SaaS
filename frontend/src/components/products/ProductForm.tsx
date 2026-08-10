"use client";

import { useEffect, useState } from "react";

import { CurrencyInput } from "@/components/ui/CurrencyInput";

import {
  INVENTORY_CONTROL_LABELS,
  PRODUCT_TYPE_LABELS,
  type AuxiliaryRecord,
  type InventoryControl,
  type Product,
  type ProductType,
  type UnitOfMeasure,
} from "@/services/product.service";

const fieldClass = `
  h-11 w-full rounded-xl border border-[var(--border)]
  bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)]
  outline-none transition-colors
  focus:border-[var(--primary)]
`;

const labelClass =
  "mb-1 block text-sm font-medium text-[var(--text-secondary)]";

interface FormState {
  code: string;
  barcode: string;
  reference: string;
  description: string;
  complementaryDescription: string;
  type: ProductType;
  inventoryControl: InventoryControl;
  categoryId: string;
  brandId: string;
  unitId: string;
  cost: number;
  salePrice: number;
  minimumStock: string;
  status: "ACTIVE" | "INACTIVE";
}

const emptyForm: FormState = {
  code: "",
  barcode: "",
  reference: "",
  description: "",
  complementaryDescription: "",
  type: "PRODUCT",
  inventoryControl: "SIMPLE",
  categoryId: "",
  brandId: "",
  unitId: "",
  cost: 0,
  salePrice: 0,
  minimumStock: "",
  status: "ACTIVE",
};

interface Props {
  product?: Product | null;
  categories: AuxiliaryRecord[];
  brands: AuxiliaryRecord[];
  units: UnitOfMeasure[];
  saving: boolean;
  error?: string;
  onSubmit: (payload: Record<string, unknown>) => void;
  onCancel: () => void;
}

export function ProductForm({
  product,
  categories,
  brands,
  units,
  saving,
  error,
  onSubmit,
  onCancel,
}: Props) {
  const [form, setForm] = useState<FormState>(emptyForm);

  useEffect(() => {
    if (product) {
      setForm({
        code: product.code ?? "",
        barcode: product.barcode ?? "",
        reference: product.reference ?? "",
        description: product.description ?? "",
        complementaryDescription:
          product.complementaryDescription ?? "",
        type: product.type,
        inventoryControl: product.inventoryControl,
        categoryId: product.categoryId ?? "",
        brandId: product.brandId ?? "",
        unitId: product.unitId ?? "",
        cost: Number(product.cost ?? 0),
        salePrice: Number(product.salePrice ?? 0),
        minimumStock:
          product.minimumStock !== null &&
          product.minimumStock !== undefined
            ? String(product.minimumStock)
            : "",
        status: product.status,
      });
    } else {
      setForm(emptyForm);
    }
  }, [product]);

  const isService = form.type === "SERVICE";

  function setField<K extends keyof FormState>(
    field: K,
    value: FormState[K]
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function handleSubmit() {
    const text = (value: string) => {
      const trimmed = value.trim();

      return trimmed.length > 0 ? trimmed : undefined;
    };

    const decimal = (value: string) => {
      // Aceita vírgula como separador decimal (padrão brasileiro).
      const normalized = value
        .replace(/\./g, "")
        .replace(",", ".");

      const parsed = Number(normalized);

      return Number.isFinite(parsed) ? parsed : 0;
    };

    // Envia somente campos editáveis: a API rejeita id/companyId/datas.
    onSubmit({
      code: form.code.trim(),
      barcode: text(form.barcode),
      reference: text(form.reference),
      description: form.description.trim(),
      complementaryDescription: text(
        form.complementaryDescription
      ),
      type: form.type,
      // Serviço não movimenta estoque.
      inventoryControl: isService
        ? "NONE"
        : form.inventoryControl,
      categoryId: text(form.categoryId),
      brandId: text(form.brandId),
      unitId: form.unitId,
      cost: form.cost,
      salePrice: form.salePrice,
      minimumStock: isService
        ? undefined
        : form.minimumStock
          ? decimal(form.minimumStock)
          : undefined,
      status: form.status,
    });
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-4">
        <div>
          <label className={labelClass} htmlFor="code">
            Código <span className="text-[var(--danger)]">*</span>
          </label>

          <input
            id="code"
            className={fieldClass}
            value={form.code}
            onChange={(e) =>
              setField("code", e.target.value)
            }
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="barcode">
            Cód. barras
          </label>

          <input
            id="barcode"
            className={fieldClass}
            value={form.barcode}
            onChange={(e) =>
              setField("barcode", e.target.value)
            }
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="reference">
            REF (fabricante)
          </label>

          <input
            id="reference"
            className={fieldClass}
            value={form.reference}
            onChange={(e) =>
              setField("reference", e.target.value)
            }
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="type">
            Tipo
          </label>

          <select
            id="type"
            className={fieldClass}
            value={form.type}
            onChange={(e) =>
              setField("type", e.target.value as ProductType)
            }
          >
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
          <label className={labelClass} htmlFor="status">
            Situação
          </label>

          <select
            id="status"
            className={fieldClass}
            value={form.status}
            onChange={(e) =>
              setField(
                "status",
                e.target.value as "ACTIVE" | "INACTIVE"
              )
            }
          >
            <option value="ACTIVE">Ativo</option>
            <option value="INACTIVE">Inativo</option>
          </select>
        </div>
      </section>

      <div>
        <label className={labelClass} htmlFor="description">
          Descrição <span className="text-[var(--danger)]">*</span>
        </label>

        <input
          id="description"
          className={fieldClass}
          value={form.description}
          onChange={(e) =>
            setField("description", e.target.value)
          }
        />
      </div>

      <div>
        <label
          className={labelClass}
          htmlFor="complementaryDescription"
        >
          Descrição complementar
        </label>

        <input
          id="complementaryDescription"
          className={fieldClass}
          value={form.complementaryDescription}
          onChange={(e) =>
            setField(
              "complementaryDescription",
              e.target.value
            )
          }
        />
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <div>
          <label className={labelClass} htmlFor="unitId">
            Unidade{" "}
            <span className="text-[var(--danger)]">*</span>
          </label>

          <select
            id="unitId"
            className={fieldClass}
            value={form.unitId}
            onChange={(e) =>
              setField("unitId", e.target.value)
            }
          >
            <option value="">Selecione...</option>

            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.code} — {unit.description}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass} htmlFor="categoryId">
            Categoria
          </label>

          <select
            id="categoryId"
            className={fieldClass}
            value={form.categoryId}
            onChange={(e) =>
              setField("categoryId", e.target.value)
            }
          >
            <option value="">Sem categoria</option>

            {categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass} htmlFor="brandId">
            Marca
          </label>

          <select
            id="brandId"
            className={fieldClass}
            value={form.brandId}
            onChange={(e) =>
              setField("brandId", e.target.value)
            }
          >
            <option value="">Sem marca</option>

            {brands.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <div>
          <label className={labelClass} htmlFor="cost">
            Custo (R$){" "}
            <span className="text-[var(--danger)]">*</span>
          </label>

          <CurrencyInput
            id="cost"
            className={fieldClass}
            value={form.cost}
            onChange={(value) => setField("cost", value)}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="salePrice">
            Preço venda (R$){" "}
            <span className="text-[var(--danger)]">*</span>
          </label>

          <CurrencyInput
            id="salePrice"
            className={fieldClass}
            value={form.salePrice}
            onChange={(value) => setField("salePrice", value)}
          />
        </div>

        {!isService && (
          <>
            <div>
              <label
                className={labelClass}
                htmlFor="inventoryControl"
              >
                Controle de estoque
              </label>

              <select
                id="inventoryControl"
                className={fieldClass}
                value={form.inventoryControl}
                onChange={(e) =>
                  setField(
                    "inventoryControl",
                    e.target.value as InventoryControl
                  )
                }
              >
                {Object.entries(
                  INVENTORY_CONTROL_LABELS
                ).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                className={labelClass}
                htmlFor="minimumStock"
              >
                Estoque mínimo
              </label>

              <input
                id="minimumStock"
                inputMode="decimal"
                placeholder="0"
                className={fieldClass}
                value={form.minimumStock}
                onChange={(e) =>
                  setField("minimumStock", e.target.value)
                }
              />
            </div>
          </>
        )}
      </section>

      {isService && (
        <p className="text-xs text-[var(--text-muted)]">
          Serviços não movimentam estoque, por isso o
          controle de estoque não se aplica.
        </p>
      )}

      {error && (
        <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)]"
        >
          Cancelar
        </button>

        <button
          type="button"
          disabled={saving}
          onClick={handleSubmit}
          className="rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-60"
        >
          {saving ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </div>
  );
}
