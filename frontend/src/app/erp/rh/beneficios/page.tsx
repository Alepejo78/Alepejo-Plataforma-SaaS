"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { OsShell } from "@/components";
import { SimpleCrudPanel } from "@/components/products/SimpleCrudPanel";

import { benefitService } from "@/services/hr.service";

export default function BeneficiosRhPage() {
  return (
    <OsShell workspaceLabel="Benefícios">
      <div className="space-y-6">
        <header>
          <Link
            href="/erp/rh/colaboradores"
            className="mb-3 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          >
            <ArrowLeft size={16} />
            Voltar para Colaboradores
          </Link>

          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Benefícios
          </h1>

          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Catálogo de benefícios usado no cadastro de
            colaboradores.
          </p>
        </header>

        <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
          <SimpleCrudPanel
            title="Benefícios"
            singular="o benefício"
            permissionPrefix="benefit"
            service={benefitService}
            fields={[
              {
                key: "name",
                label: "Nome (ex.: Vale Refeição)",
                required: true,
                maxLength: 120,
              },
              {
                key: "description",
                label: "Descrição",
                maxLength: 255,
              },
              {
                key: "calculationType",
                label: "Cálculo",
                type: "select",
                defaultValue: "FIXED",
                options: [
                  { value: "FIXED", label: "Valor fixo" },
                  {
                    value: "PERCENTAGE",
                    label: "% do salário",
                  },
                ],
              },
            ]}
          />
        </div>
      </div>
    </OsShell>
  );
}
