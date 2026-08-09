"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AppShell } from "@/components";
import { SimpleCrudPanel } from "@/components/products/SimpleCrudPanel";

import {
  ppeTypeService,
  sectorService,
  workScheduleService,
} from "@/services/hr.service";

export default function CadastrosRhPage() {
  return (
    <AppShell workspaceLabel="Cadastros de RH">
      <div className="space-y-6">
        <header>
          <Link
            href="/erp/rh/funcoes"
            className="mb-3 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          >
            <ArrowLeft size={16} />
            Voltar para Funções
          </Link>

          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Setores, horários e tipos de EPI
          </h1>

          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Cadastros auxiliares usados no cadastro de funções.
          </p>
        </header>

        <div className="grid gap-5 lg:grid-cols-3">
          <SimpleCrudPanel
            title="Setores"
            singular="o setor"
            permissionPrefix="sector"
            service={sectorService}
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
            title="Horários de trabalho"
            singular="o horário"
            permissionPrefix="work-schedule"
            service={workScheduleService}
            fields={[
              {
                key: "name",
                label: "Nome (ex.: Comercial)",
                required: true,
                maxLength: 120,
              },
              {
                key: "description",
                label: "Horário (ex.: SEG A SEX: 07:30-12:00)",
                maxLength: 255,
              },
            ]}
          />

          <SimpleCrudPanel
            title="Tipos de EPI"
            singular="o tipo de EPI"
            permissionPrefix="ppe-type"
            service={ppeTypeService}
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
    </AppShell>
  );
}
