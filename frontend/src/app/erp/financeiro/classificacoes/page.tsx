"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { OsShell } from "@/components";
import { SimpleCrudPanel } from "@/components/products/SimpleCrudPanel";

import { chartOfAccountClassificationService } from "@/services/chart-of-account-classification.service";

export default function ClassificacoesPage() {
  return (
    <OsShell workspaceLabel="Financeiro">
      <div className="space-y-6">
        <header>
          <Link
            href="/erp/financeiro/plano-contas"
            className="mb-3 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          >
            <ArrowLeft size={16} />
            Voltar para Plano de contas
          </Link>

          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Classificações
          </h1>

          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Agrupadores usados para organizar as contas do
            plano de contas (ex.: &quot;Adminstrativo&quot;,
            &quot;Bancos/Taxas&quot;).
          </p>
        </header>

        <div className="max-w-md">
          <SimpleCrudPanel
            title="Classificações"
            singular="a classificação"
            permissionPrefix="chart-of-account-classification"
            service={chartOfAccountClassificationService}
            fields={[
              {
                key: "name",
                label: "Nome",
                required: true,
                maxLength: 120,
              },
            ]}
          />
        </div>
      </div>
    </OsShell>
  );
}
