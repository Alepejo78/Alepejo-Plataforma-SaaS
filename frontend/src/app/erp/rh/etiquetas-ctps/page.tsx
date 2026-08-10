"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Printer } from "lucide-react";

import { AppShell } from "@/components";
import { ListPageLayout } from "@/components/layout/ListPageLayout";
import { SearchSelect } from "@/components/ui/SearchSelect";

import {
  employeeService,
  type Employee,
} from "@/services/hr.service";

export default function EtiquetasCtpsPage() {
  const [employee, setEmployee] = useState<Employee | null>(
    null
  );
  const [employeeLabel, setEmployeeLabel] = useState("");

  const searchEmployees = useCallback(
    async (query: string) => {
      return employeeService.list({
        search: query || undefined,
        limit: 20,
      });
    },
    []
  );

  return (
    <AppShell workspaceLabel="Recursos Humanos">
      <ListPageLayout
        header={
          <>
            <header>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                Etiquetas CTPS
              </h1>

              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Gere a etiqueta de anotação de admissão para
                colar na carteira de trabalho do colaborador.
              </p>
            </header>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <SearchSelect<Employee>
                displayLabel={employeeLabel}
                search={searchEmployees}
                getId={(e) => e.id}
                getLabel={(e) => e.name}
                getSubLabel={(e) => e.jobFunction?.name}
                placeholder="Digite para buscar o colaborador..."
                onSelect={(e) => {
                  setEmployee(e);
                  setEmployeeLabel(e?.name ?? "");
                }}
              />
            </div>
          </>
        }
      >
        {!employee ? (
          <div className="p-12 text-center">
            <p className="font-medium text-[var(--text-primary)]">
              Selecione um colaborador
            </p>

            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Busque pelo nome acima para gerar a etiqueta.
            </p>
          </div>
        ) : (
          <div className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] p-4">
              <div>
                <p className="font-semibold text-[var(--text-primary)]">
                  {employee.name}
                </p>

                <p className="text-sm text-[var(--text-muted)]">
                  {employee.jobFunction?.name ?? "Sem função"}
                  {employee.jobFunction?.sector?.name &&
                    ` · ${employee.jobFunction.sector.name}`}
                </p>
              </div>

              <Link
                href={`/erp/rh/etiquetas-ctps/${employee.id}`}
                target="_blank"
                className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)]"
              >
                <Printer size={18} />
                Gerar etiqueta
              </Link>
            </div>
          </div>
        )}
      </ListPageLayout>
    </AppShell>
  );
}
