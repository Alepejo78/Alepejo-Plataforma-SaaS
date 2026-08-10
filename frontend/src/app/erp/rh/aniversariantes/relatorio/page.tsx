"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Printer } from "lucide-react";

import {
  employeeReportsService,
  type EmployeeBirthday,
} from "@/services/hr.service";
import { companyService } from "@/services/company.service";
import { exportCsv } from "@/lib/exportCsv";

const MONTH_LABELS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const fieldClass = `
  h-11 w-full rounded-xl border border-[var(--border)]
  bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)]
  outline-none transition-colors focus:border-[var(--primary)]
`;

const labelClass =
  "mb-1 block text-sm font-medium text-[var(--text-secondary)]";

export default function RelatorioAniversariantesPage() {
  const [companyName, setCompanyName] = useState("");
  const [month, setMonth] = useState(
    () => new Date().getMonth() + 1
  );

  const [birthdays, setBirthdays] = useState<
    EmployeeBirthday[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    companyService
      .getMine()
      .then((c) =>
        setCompanyName(c.tradeName || c.legalName || "")
      )
      .catch(() => {});
  }, []);

  const load = useCallback(async (targetMonth: number) => {
    setLoading(true);
    setError("");

    try {
      const result = await employeeReportsService.getBirthdays(
        targetMonth
      );

      setBirthdays(result);
    } catch (err) {
      setError(
        "Não foi possível carregar os aniversariantes."
      );
      void err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(month);
  }, [month, load]);

  function handleExport() {
    exportCsv(
      `aniversariantes-${MONTH_LABELS[month - 1]}`,
      ["Dia", "Colaborador", "Função", "Setor"],
      birthdays.map((b) => [
        b.day,
        b.name,
        b.jobFunctionName ?? "",
        b.sectorName ?? "",
      ])
    );
  }

  const today = new Date().toLocaleDateString("pt-BR");

  return (
    <div className="mx-auto max-w-4xl p-6 print:max-w-none print:p-0">
      <style>{`
        @media print {
          @page { size: portrait; margin: 15mm; }
        }
      `}</style>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href="/erp/rh/aniversariantes"
          className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={16} />
          Voltar
        </Link>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={birthdays.length === 0}
            className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] disabled:opacity-50"
          >
            <Download size={18} />
            Exportar CSV
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            disabled={birthdays.length === 0}
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

        <div className="max-w-xs">
          <label className={labelClass}>Mês</label>

          <select
            className={fieldClass}
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          >
            {MONTH_LABELS.map((label, index) => (
              <option key={label} value={index + 1}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <h1 className="text-xl font-bold text-[var(--text-primary)] print:text-black">
          Aniversariantes de {MONTH_LABELS[month - 1]}
        </h1>

        <p className="text-sm text-[var(--text-muted)] print:text-black">
          {companyName} — gerado em {today} —{" "}
          {birthdays.length}{" "}
          {birthdays.length === 1
            ? "aniversariante"
            : "aniversariantes"}
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
                Dia
              </th>
              <th className="px-3 py-2 font-semibold print:border print:border-black">
                Colaborador
              </th>
              <th className="px-3 py-2 font-semibold print:border print:border-black">
                Função
              </th>
              <th className="px-3 py-2 font-semibold print:border print:border-black">
                Setor
              </th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-3 py-6 text-center text-[var(--text-muted)]"
                >
                  Carregando...
                </td>
              </tr>
            ) : birthdays.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-3 py-6 text-center text-[var(--text-muted)]"
                >
                  Nenhum aniversariante em{" "}
                  {MONTH_LABELS[month - 1].toLowerCase()}.
                </td>
              </tr>
            ) : (
              birthdays.map((b) => (
                <tr
                  key={b.id}
                  className="border-t border-[var(--border)] print:border-black"
                >
                  <td className="whitespace-nowrap px-3 py-2 font-semibold text-[var(--text-primary)] print:border print:border-black print:text-black">
                    {String(b.day).padStart(2, "0")}
                  </td>
                  <td className="px-3 py-2 font-medium text-[var(--text-primary)] print:border print:border-black print:text-black">
                    {b.name}
                  </td>
                  <td className="px-3 py-2 text-[var(--text-secondary)] print:border print:border-black print:text-black">
                    {b.jobFunctionName ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-[var(--text-secondary)] print:border print:border-black print:text-black">
                    {b.sectorName ?? "—"}
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
