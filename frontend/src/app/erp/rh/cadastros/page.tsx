"use client";

import Link from "next/link";
import { ArrowLeft, Clock, Settings } from "lucide-react";

import { AppShell } from "@/components";
import { Can } from "@/components/auth/Can";
import { SimpleCrudPanel } from "@/components/products/SimpleCrudPanel";

import { ppeTypeService, sectorService } from "@/services/hr.service";

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
            Setores, horários e EPI
          </h1>

          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Cadastros auxiliares usados no cadastro de funções.
          </p>
        </header>

        <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
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

          <section className="rounded-2xl border border-[var(--border)] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-semibold text-[var(--text-primary)]">
                <Clock size={18} />
                Horários de trabalho
              </h2>
            </div>

            <p className="mb-4 text-sm text-[var(--text-muted)]">
              Nome do horário e as faixas de dias/horários usadas
              pro cálculo de horas no Controle de Ponto (uma
              subtela própria, um horário pode ter mais de uma
              faixa).
            </p>

            <Can permission="work-schedule.view">
              <Link
                href="/erp/rh/cadastros/horarios"
                className="flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
              >
                <Settings size={16} />
                Gerenciar horários de trabalho
              </Link>
            </Can>
          </section>

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
