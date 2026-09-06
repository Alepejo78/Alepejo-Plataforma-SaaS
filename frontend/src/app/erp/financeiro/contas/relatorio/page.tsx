"use client";

import { ReportAccessGuard } from "@/components/reports/ReportAccessGuard";
import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Download, Printer } from "lucide-react";

import {
  FINANCIAL_ENTRY_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  financialEntryService,
  type FinancialEntry,
  type FinancialEntryStatus,
  type FinancialEntryType,
} from "@/services/financial-entry.service";
import { companyService } from "@/services/company.service";
import { exportCsv } from "@/lib/exportCsv";

function num(value: string | number | null | undefined) {
  return Number(value ?? 0);
}

function money(value: string | number | null | undefined) {
  return num(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function date(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
  });
}

const fieldClass = `
  h-11 w-full rounded-xl border border-[var(--border)]
  bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)]
  outline-none transition-colors focus:border-[var(--primary)]
`;

const labelClass =
  "mb-1 block text-sm font-medium text-[var(--text-secondary)]";

function RelatorioContasPageInner() {
  return (
    <Suspense fallback={null}>
      <RelatorioContasContent />
    </Suspense>
  );
}

function RelatorioContasContent() {
  const searchParams = useSearchParams();
  const initialType =
    (searchParams.get("type") as FinancialEntryType) ||
    "RECEIVABLE";

  const [companyName, setCompanyName] = useState("");

  const [type, setType] =
    useState<FinancialEntryType>(initialType);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<
    FinancialEntryStatus | ""
  >("");
  const [dueFrom, setDueFrom] = useState("");
  const [dueTo, setDueTo] = useState("");

  const [entries, setEntries] = useState<FinancialEntry[]>(
    []
  );
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

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await financialEntryService.list({
        type,
        search: search || undefined,
        status: status || undefined,
        dueFrom: dueFrom || undefined,
        dueTo: dueTo || undefined,
        limit: 10000,
      });

      setEntries(result.data);
    } catch (err) {
      setError("Não foi possível carregar os títulos.");
      void err;
    } finally {
      setLoading(false);
    }
  }, [type, search, status, dueFrom, dueTo]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 300);

    return () => clearTimeout(timer);
  }, [load]);

  function handleExport() {
    exportCsv(
      `relatorio-contas-${
        type === "RECEIVABLE" ? "receber" : "pagar"
      }`,
      [
        "Documento",
        "Parceiro",
        "Emissão",
        "Vencimento",
        "Valor",
        "Pago",
        "Status",
        "Forma de pagamento",
        "Criado por",
        "Alterado por",
      ],
      entries.map((e) => [
        e.documentNumber ?? "",
        e.partner?.tradeName ||
          e.partner?.legalName ||
          e.employee?.name ||
          "",
        date(e.issueDate),
        date(e.dueDate),
        money(e.amount),
        money(e.paidAmount),
        FINANCIAL_ENTRY_STATUS_LABELS[e.status],
        e.paymentMethod
          ? PAYMENT_METHOD_LABELS[e.paymentMethod]
          : "",
        e.createdByName || "",
        e.updatedByName || "",
      ])
    );
  }

  const today = new Date().toLocaleDateString("pt-BR");
  const total = entries.reduce(
    (soma, e) => soma + num(e.amount),
    0
  );
  const totalPago = entries.reduce(
    (soma, e) => soma + num(e.paidAmount),
    0
  );

  return (
    <div className="mx-auto max-w-6xl p-6 print:max-w-none print:p-0">
      <style>{`
        @media print {
          @page { size: landscape; margin: 12mm; }
        }
      `}</style>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href={
            type === "RECEIVABLE"
              ? "/erp/financeiro/receber"
              : "/erp/financeiro/pagar"
          }
          className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={16} />
          Voltar
        </Link>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={entries.length === 0}
            className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] disabled:opacity-50"
          >
            <Download size={18} />
            Exportar CSV
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            disabled={entries.length === 0}
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

        <div className="mb-4 flex gap-2">
          {(
            [
              ["RECEIVABLE", "Contas a receber"],
              ["PAYABLE", "Contas a pagar"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setType(value)}
              className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                type === value
                  ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary-text)]"
                  : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className={labelClass}>Buscar</label>

            <input
              className={fieldClass}
              placeholder="Documento ou parceiro..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass}>Status</label>

            <select
              className={fieldClass}
              value={status}
              onChange={(e) =>
                setStatus(
                  e.target.value as FinancialEntryStatus | ""
                )
              }
            >
              <option value="">Todos</option>

              {Object.entries(
                FINANCIAL_ENTRY_STATUS_LABELS
              ).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>
              Vencimento — de
            </label>

            <input
              type="date"
              className={fieldClass}
              value={dueFrom}
              onChange={(e) => setDueFrom(e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass}>
              Vencimento — até
            </label>

            <input
              type="date"
              className={fieldClass}
              value={dueTo}
              onChange={(e) => setDueTo(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <h1 className="text-xl font-bold text-[var(--text-primary)] print:text-black">
          Relatório de{" "}
          {type === "RECEIVABLE"
            ? "Contas a Receber"
            : "Contas a Pagar"}
        </h1>

        <p className="text-sm text-[var(--text-muted)] print:text-black">
          {companyName} — gerado em {today} —{" "}
          {entries.length}{" "}
          {entries.length === 1 ? "título" : "títulos"} —
          total {money(total)} — pago {money(totalPago)}
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
                Documento
              </th>
              <th className="px-3 py-2 font-semibold print:border print:border-black">
                Parceiro
              </th>
              <th className="px-3 py-2 font-semibold print:border print:border-black">
                Emissão
              </th>
              <th className="px-3 py-2 font-semibold print:border print:border-black">
                Vencimento
              </th>
              <th className="px-3 py-2 text-right font-semibold print:border print:border-black">
                Valor
              </th>
              <th className="px-3 py-2 text-right font-semibold print:border print:border-black">
                Pago
              </th>
              <th className="px-3 py-2 font-semibold print:border print:border-black">
                Status
              </th>
              <th className="px-3 py-2 font-semibold print:border print:border-black">
                Criado por
              </th>
              <th className="px-3 py-2 font-semibold print:border print:border-black">
                Alterado por
              </th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-3 py-6 text-center text-[var(--text-muted)]"
                >
                  Carregando...
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-3 py-6 text-center text-[var(--text-muted)]"
                >
                  Nenhum título encontrado com esses
                  filtros.
                </td>
              </tr>
            ) : (
              entries.map((e) => (
                <tr
                  key={e.id}
                  className="border-t border-[var(--border)] print:border-black"
                >
                  <td className="whitespace-nowrap px-3 py-2 text-[var(--text-secondary)] print:border print:border-black print:text-black">
                    {e.documentNumber || "—"}
                  </td>
                  <td className="px-3 py-2 font-medium text-[var(--text-primary)] print:border print:border-black print:text-black">
                    {e.partner?.tradeName ||
                      e.partner?.legalName ||
                      e.employee?.name ||
                      "—"}
                  </td>
                  <td className="px-3 py-2 text-[var(--text-secondary)] print:border print:border-black print:text-black">
                    {date(e.issueDate)}
                  </td>
                  <td className="px-3 py-2 text-[var(--text-secondary)] print:border print:border-black print:text-black">
                    {date(e.dueDate)}
                  </td>
                  <td className="px-3 py-2 text-right text-[var(--text-secondary)] print:border print:border-black print:text-black">
                    {money(e.amount)}
                  </td>
                  <td className="px-3 py-2 text-right text-[var(--text-secondary)] print:border print:border-black print:text-black">
                    {money(e.paidAmount)}
                  </td>
                  <td className="px-3 py-2 text-[var(--text-secondary)] print:border print:border-black print:text-black">
                    {FINANCIAL_ENTRY_STATUS_LABELS[e.status]}
                  </td>
                  <td className="px-3 py-2 text-[var(--text-secondary)] print:border print:border-black print:text-black">
                    {e.createdByName || "—"}
                  </td>
                  <td className="px-3 py-2 text-[var(--text-secondary)] print:border print:border-black print:text-black">
                    {e.updatedByName || "—"}
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

export default function RelatorioContasPage() {
  return (
    <ReportAccessGuard permission="financial-entry.report">
      <RelatorioContasPageInner />
    </ReportAccessGuard>
  );
}
