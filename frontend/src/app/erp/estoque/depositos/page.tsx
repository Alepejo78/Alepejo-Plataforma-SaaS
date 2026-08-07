"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AppShell } from "@/components";
import { SimpleCrudPanel } from "@/components/products/SimpleCrudPanel";

import { warehouseService } from "@/services/inventory.service";

/**
 * O SimpleCrudPanel espera um serviço com list(search) -> { data },
 * então adaptamos a assinatura do warehouseService aqui.
 */
const adaptedService = {
  list: async (search?: string) => ({
    data: await warehouseService.list(search),
  }),
  create: warehouseService.create,
  update: warehouseService.update,
  remove: warehouseService.remove,
};

export default function DepositosPage() {
  return (
    <AppShell workspaceLabel="Depósitos">
      <div className="space-y-6">
        <header>
          <Link
            href="/erp/estoque"
            className="mb-3 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          >
            <ArrowLeft size={16} />
            Voltar para Estoque
          </Link>

          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Depósitos
          </h1>

          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Locais onde os produtos ficam armazenados. É
            preciso ao menos um depósito para controlar
            estoque.
          </p>
        </header>

        <div className="max-w-2xl">
          <SimpleCrudPanel
            title="Depósitos cadastrados"
            singular="o depósito"
            permissionPrefix="warehouse"
            service={adaptedService}
            fields={[
              {
                key: "code",
                label: "Código (DEP001)",
                required: true,
                maxLength: 20,
                width: "max-w-40",
              },
              {
                key: "description",
                label: "Descrição",
                required: true,
                maxLength: 120,
              },
            ]}
          />
        </div>
      </div>
    </AppShell>
  );
}
