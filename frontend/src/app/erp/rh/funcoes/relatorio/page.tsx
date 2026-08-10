"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Printer } from "lucide-react";

import {
  jobFunctionService,
  sectorService,
  type AuxiliaryRecord,
  type JobFunction,
} from "@/services/hr.service";
import { companyService } from "@/services/company.service";
import { exportCsv } from "@/lib/exportCsv";

const fieldClass = `
  h-11 w-full rounded-xl border border-[var(--border)]
  bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)]
  outline-none transition-colors focus:border-[var(--primary)]
`;

const labelClass =
  "mb-1 block text-sm font-medium text-[var(--text-secondary)]";

export default function RelatorioFuncoesPage() {
  const [sectors, setSectors] = useState<AuxiliaryRecord[]>(
    []
  );
  const [companyName, setCompanyName] = useState("");

  const [search, setSearch] = useState("");
  const [sectorId, setSectorId] = useState("");

  const [functions, setFunctions] = useState<JobFunction[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    sectorService
      .list()
      .then((r) => setSectors(r.data ?? []))
      .catch(() => {});

    companyService
      .getMine()
      .then((c) =>
        setCompanyName(c.tradeName || c.legalName || "")
      )
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await jobFunctionService.list({
        search: search || undefined,
        sectorId: sectorId || undefined,
        limit: 100,
      });

      setFunctions(result);
    } catch (err) {
      setError("Não foi possível carregar as funções.");
      void err;
    } finally {
      setLoading(false);
    }
  }, [search, sectorId]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 300);

    return () => clearTimeout(timer);
  }, [load]);

  function handleExport() {
    exportCsv(
      "relatorio-funcoes",
      [
        "Função",
        "CBO",
        "Setor",
        "Horário",
        "Exige EPI",
        "Descrição",
      ],
      functions.map((f) => [
        f.name,
        f.cboCode
          ? `${f.cboCode} - ${f.cboTitle ?? ""}`
          : "",
        f.sector?.name ?? "",
        f.workSchedule?.name ?? "",
        f.requiresPpe ? "Sim" : "Não",
        f.description ?? "",
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
          href="/erp/rh/funcoes"
          className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={16} />
          Voltar
        </Link>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={functions.length === 0}
            className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] disabled:opacity-50"
          >
            <Download size={18} />
            Exportar CSV
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            disabled={functions.length === 0}
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

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Buscar</label>

            <input
              className={fieldClass}
              placeholder="Nome da função ou CBO..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass}>Setor</label>

            <select
              className={fieldClass}
              value={sectorId}
              onChange={(e) => setSectorId(e.target.value)}
            >
              <option value="">Todos</option>

              {sectors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <h1 className="text-xl font-bold text-[var(--text-primary)] print:text-black">
          Relatório de Funções
        </h1>

        <p className="text-sm text-[var(--text-muted)] print:text-black">
          {companyName} — gerado em {today} —{" "}
          {functions.length}{" "}
          {functions.length === 1 ? "função" : "funções"}
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
                Função
              </th>
              <th className="px-3 py-2 font-semibold print:border print:border-black">
                CBO
              </th>
              <th className="px-3 py-2 font-semibold print:border print:border-black">
                Setor
              </th>
              <th className="px-3 py-2 font-semibold print:border print:border-black">
                Horário
              </th>
              <th className="px-3 py-2 font-semibold print:border print:border-black">
                Exige EPI
              </th>
              <th className="px-3 py-2 font-semibold print:border print:border-black">
                Descrição
              </th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-6 text-center text-[var(--text-muted)]"
                >
                  Carregando...
                </td>
              </tr>
            ) : functions.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-6 text-center text-[var(--text-muted)]"
                >
                  Nenhuma função encontrada com esses
                  filtros.
                </td>
              </tr>
            ) : (
              functions.map((f) => (
                <tr
                  key={f.id}
                  className="border-t border-[var(--border)] print:border-black"
                >
                  <td className="px-3 py-2 font-medium text-[var(--text-primary)] print:border print:border-black print:text-black">
                    {f.name}
                  </td>
                  <td className="px-3 py-2 text-[var(--text-secondary)] print:border print:border-black print:text-black">
                    {f.cboCode
                      ? `${f.cboCode} - ${f.cboTitle ?? ""}`
                      : "—"}
                  </td>
                  <td className="px-3 py-2 text-[var(--text-secondary)] print:border print:border-black print:text-black">
                    {f.sector?.name ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-[var(--text-secondary)] print:border print:border-black print:text-black">
                    {f.workSchedule?.name ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-[var(--text-secondary)] print:border print:border-black print:text-black">
                    {f.requiresPpe ? "Sim" : "Não"}
                  </td>
                  <td className="px-3 py-2 text-[var(--text-secondary)] print:border print:border-black print:text-black">
                    {f.description || "—"}
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
