"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { OsShell } from "@/components";
import { SimpleCrudPanel } from "@/components/products/SimpleCrudPanel";

import {
  brandService,
  categoryService,
  unitService,
} from "@/services/product.service";

export default function CadastrosProdutoPage() {
  return (
    <OsShell workspaceLabel="Cadastros de produto">
      <div className="space-y-6">
        <header>
          <Link
            href="/erp/produtos"
            className="mb-3 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          >
            <ArrowLeft size={16} />
            Voltar para Produtos
          </Link>

          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Categorias, marcas e unidades
          </h1>

          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Cadastros auxiliares usados no cadastro de
            produtos. A unidade de medida é obrigatória.
          </p>
        </header>

        <div className="grid gap-5 lg:grid-cols-3">
          <SimpleCrudPanel
            title="Unidades de medida"
            singular="a unidade"
            permissionPrefix="unit-of-measure"
            service={unitService}
            fields={[
              {
                key: "code",
                label: "Sigla (UN, KG...)",
                required: true,
                maxLength: 10,
                width: "max-w-32",
              },
              {
                key: "description",
                label: "Descrição",
                required: true,
                maxLength: 120,
              },
            ]}
          />

          <SimpleCrudPanel
            title="Categorias"
            singular="a categoria"
            permissionPrefix="product-category"
            service={categoryService}
            fields={[
              {
                key: "name",
                label: "Nome",
                required: true,
                maxLength: 120,
              },
              {
                key: "description",
                label: "Descrição",
                maxLength: 255,
              },
            ]}
          />

          <SimpleCrudPanel
            title="Marcas"
            singular="a marca"
            permissionPrefix="brand"
            service={brandService}
            fields={[
              {
                key: "name",
                label: "Nome",
                required: true,
                maxLength: 120,
              },
              {
                key: "description",
                label: "Descrição",
                maxLength: 255,
              },
            ]}
          />
        </div>
      </div>
    </OsShell>
  );
}
