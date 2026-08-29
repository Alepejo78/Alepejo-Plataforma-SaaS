"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
} from "lucide-react";

import { AppShell } from "@/components";
import { ListPageLayout } from "@/components/layout/ListPageLayout";
import { ExportButton } from "@/components/ui/ExportButton";

import {
  employeeReportsService,
  type EmployeeBirthday,
} from "@/services/hr.service";

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

function extractMessage(err: unknown, fallback: string) {
  const message = (
    err as { response?: { data?: { message?: unknown } } }
  )?.response?.data?.message;

  if (Array.isArray(message)) {
    return message.join(" ");
  }

  return typeof message === "string" ? message : fallback;
}

export default function AniversariantesPage() {
  const exportTableRef = useRef<HTMLTableElement>(null);
  const [month, setMonth] = useState(
    () => new Date().getMonth() + 1
  );
  const [birthdays, setBirthdays] = useState<EmployeeBirthday[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
        extractMessage(
          err,
          "Não foi possível carregar os aniversariantes."
        )
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(month);
  }, [month, load]);

  return (
    <AppShell workspaceLabel="Recursos Humanos">
      <ListPageLayout
        header={
          <>
            <header className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                  Aniversariantes
                </h1>

                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Colaboradores ativos que fazem aniversário no
                  mês selecionado.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <ExportButton
                  tableRef={exportTableRef}
                  filename="aniversariantes"
                  sheetName="Aniversariantes"
                />

                <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setMonth((m) => (m === 1 ? 12 : m - 1))
                  }
                  aria-label="Mês anterior"
                  className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)]"
                >
                  <ChevronLeft size={18} />
                </button>

                <span className="w-36 text-center text-lg font-semibold text-[var(--text-primary)]">
                  {MONTH_LABELS[month - 1]}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setMonth((m) => (m === 12 ? 1 : m + 1))
                  }
                  aria-label="Próximo mês"
                  className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)]"
                >
                  <ChevronRight size={18} />
                </button>

                <Link
                  href="/erp/rh/aniversariantes/relatorio"
                  target="_blank"
                  className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                >
                  <FileText size={18} />
                  Relatório
                </Link>
                </div>
              </div>
            </header>

            {error && (
              <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                {error}
              </div>
            )}
          </>
        }
      >
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-12 animate-pulse rounded-xl bg-[var(--surface-hover)]"
              />
            ))}
          </div>
        ) : birthdays.length === 0 ? (
          <p className="p-12 text-center text-sm text-[var(--text-muted)]">
            Nenhum aniversariante em{" "}
            {MONTH_LABELS[month - 1].toLowerCase()}.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table ref={exportTableRef} className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-[var(--table-header-bg)] text-[var(--table-header-fg)]">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold uppercase tracking-wide">
                    Dia
                  </th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wide">
                    Colaborador
                  </th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wide">
                    Função
                  </th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wide">
                    Setor
                  </th>
                </tr>
              </thead>

              <tbody>
                {birthdays.map((b) => (
                  <tr
                    key={b.id}
                    className="border-t border-[var(--border)]"
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-[var(--text-primary)]">
                      {String(b.day).padStart(2, "0")}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-primary)]">
                      {b.name}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">
                      {b.jobFunctionName ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">
                      {b.sectorName ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ListPageLayout>
    </AppShell>
  );
}
