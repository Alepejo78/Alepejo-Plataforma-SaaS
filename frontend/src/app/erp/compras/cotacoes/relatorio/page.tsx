"use client";

import { ReportAccessGuard } from "@/components/reports/ReportAccessGuard";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Printer } from "lucide-react";

import {
  QUOTATION_STATUS_LABELS,
  quotationService,
  type Quotation,
  type QuotationOffer,
  type QuotationStatus,
} from "@/services/quotation.service";
import { PAYMENT_METHOD_LABELS } from "@/services/financial-entry.service";
import { companyService } from "@/services/company.service";
import { exportCsv } from "@/lib/exportCsv";

function formatNumber(n: number) {
  return `COT-${String(n).padStart(6, "0")}`;
}

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

function winnerOf(q: Quotation) {
  return q.offers.find((o) => o.isWinner) ?? null;
}

function RelatorioCotacoesPageInner() {
  const [companyName, setCompanyName] = useState("");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<
    QuotationStatus | ""
  >("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [quotations, setQuotations] = useState<Quotation[]>(
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
      const result = await quotationService.list({
        status: status || undefined,
      });

      setQuotations(result);
    } catch (err) {
      setError("Não foi possível carregar as cotações.");
      void err;
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = quotations.filter((q) => {
    if (search) {
      const term = search.toLowerCase();
      const winnerName = (
        winnerOf(q)?.partner?.tradeName ||
        winnerOf(q)?.partner?.legalName ||
        ""
      ).toLowerCase();

      if (
        !winnerName.includes(term) &&
        !formatNumber(q.number)
          .toLowerCase()
          .includes(term)
      ) {
        return false;
      }
    }

    const ref = q.quotationDate ?? q.createdAt;

    if (ref) {
      const day = ref.slice(0, 10);

      if (startDate && day < startDate) return false;
      if (endDate && day > endDate) return false;
    }

    return true;
  });

  function sortedOffers(q: Quotation) {
    return [...q.offers].sort(
      (a, b) => num(a.totalAmount) - num(b.totalAmount)
    );
  }

  function handleExport() {
    const rows: (string | number)[][] = [];

    for (const q of filtered) {
      const offers = sortedOffers(q);

      if (offers.length === 0) {
        rows.push([
          formatNumber(q.number),
          date(q.quotationDate ?? q.createdAt),
          QUOTATION_STATUS_LABELS[q.status],
          "",
          "",
          "",
          "",
          "",
        ]);

        continue;
      }

      for (const o of offers) {
        rows.push([
          formatNumber(q.number),
          date(q.quotationDate ?? q.createdAt),
          QUOTATION_STATUS_LABELS[q.status],
          o.partner?.tradeName || o.partner?.legalName || "",
          o.termDays ?? "",
          o.paymentMethod
            ? PAYMENT_METHOD_LABELS[o.paymentMethod]
            : "",
          money(o.totalAmount),
          o.isWinner ? "Sim" : "Não",
        ]);
      }
    }

    exportCsv(
      "relatorio-cotacoes",
      [
        "Número",
        "Data",
        "Status",
        "Fornecedor",
        "Prazo (dias)",
        "Forma de pagamento",
        "Valor",
        "Vencedora",
      ],
      rows
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
          href="/erp/compras/cotacoes"
          className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={16} />
          Voltar
        </Link>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] disabled:opacity-50"
          >
            <Download size={18} />
            Exportar CSV
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            disabled={filtered.length === 0}
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

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className={labelClass}>Buscar</label>

            <input
              className={fieldClass}
              placeholder="Número ou fornecedor vencedor..."
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
                  e.target.value as QuotationStatus | ""
                )
              }
            >
              <option value="">Todos</option>

              {Object.entries(QUOTATION_STATUS_LABELS).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label className={labelClass}>De</label>

            <input
              type="date"
              className={fieldClass}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass}>Até</label>

            <input
              type="date"
              className={fieldClass}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <h1 className="text-xl font-bold text-[var(--text-primary)] print:text-black">
          Relatório de Cotações
        </h1>

        <p className="text-sm text-[var(--text-muted)] print:text-black">
          {companyName} — gerado em {today} —{" "}
          {filtered.length}{" "}
          {filtered.length === 1 ? "cotação" : "cotações"}
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
                Número
              </th>
              <th className="px-3 py-2 font-semibold print:border print:border-black">
                Data
              </th>
              <th className="px-3 py-2 font-semibold print:border print:border-black">
                Status
              </th>
              <th className="px-3 py-2 font-semibold print:border print:border-black">
                Fornecedor
              </th>
              <th className="px-3 py-2 text-right font-semibold print:border print:border-black">
                Prazo
              </th>
              <th className="px-3 py-2 font-semibold print:border print:border-black">
                Forma de pagamento
              </th>
              <th className="px-3 py-2 text-right font-semibold print:border print:border-black">
                Valor
              </th>
              <th className="px-3 py-2 text-center font-semibold print:border print:border-black">
                Vencedora
              </th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-3 py-6 text-center text-[var(--text-muted)]"
                >
                  Carregando...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-3 py-6 text-center text-[var(--text-muted)]"
                >
                  Nenhuma cotação encontrada com esses
                  filtros.
                </td>
              </tr>
            ) : (
              filtered.map((q) => {
                const offers = sortedOffers(q);

                if (offers.length === 0) {
                  return (
                    <tr
                      key={q.id}
                      className="border-t-2 border-[var(--border-strong)] print:border-black"
                    >
                      <td className="whitespace-nowrap px-3 py-2 font-semibold text-[var(--text-primary)] print:border print:border-black print:text-black">
                        {formatNumber(q.number)}
                      </td>
                      <td className="px-3 py-2 text-[var(--text-secondary)] print:border print:border-black print:text-black">
                        {date(
                          q.quotationDate ?? q.createdAt
                        )}
                      </td>
                      <td className="px-3 py-2 text-[var(--text-secondary)] print:border print:border-black print:text-black">
                        {QUOTATION_STATUS_LABELS[q.status]}
                      </td>
                      <td
                        colSpan={5}
                        className="px-3 py-2 text-[var(--text-muted)] print:border print:border-black print:text-black"
                      >
                        Sem propostas registradas.
                      </td>
                    </tr>
                  );
                }

                return offers.map(
                  (o: QuotationOffer, index: number) => (
                    <tr
                      key={o.id}
                      className={`${
                        index === 0
                          ? "border-t-2 border-[var(--border-strong)]"
                          : "border-t border-[var(--border)]"
                      } print:border-black ${
                        o.isWinner
                          ? "bg-[var(--success-soft)]"
                          : ""
                      }`}
                    >
                      <td className="whitespace-nowrap px-3 py-2 font-semibold text-[var(--text-primary)] print:border print:border-black print:text-black">
                        {index === 0
                          ? formatNumber(q.number)
                          : ""}
                      </td>
                      <td className="px-3 py-2 text-[var(--text-secondary)] print:border print:border-black print:text-black">
                        {index === 0
                          ? date(
                              q.quotationDate ??
                                q.createdAt
                            )
                          : ""}
                      </td>
                      <td className="px-3 py-2 text-[var(--text-secondary)] print:border print:border-black print:text-black">
                        {index === 0
                          ? QUOTATION_STATUS_LABELS[
                              q.status
                            ]
                          : ""}
                      </td>
                      <td
                        className={`px-3 py-2 print:border print:border-black print:text-black ${
                          o.isWinner
                            ? "font-semibold text-[var(--success)]"
                            : "text-[var(--text-primary)]"
                        }`}
                      >
                        {o.partner?.tradeName ||
                          o.partner?.legalName ||
                          "—"}
                      </td>
                      <td className="px-3 py-2 text-right text-[var(--text-secondary)] print:border print:border-black print:text-black">
                        {o.termDays != null
                          ? `${o.termDays} dias`
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-[var(--text-secondary)] print:border print:border-black print:text-black">
                        {o.paymentMethod
                          ? PAYMENT_METHOD_LABELS[
                              o.paymentMethod
                            ]
                          : "—"}
                      </td>
                      <td
                        className={`px-3 py-2 text-right print:border print:border-black print:text-black ${
                          o.isWinner
                            ? "font-semibold text-[var(--success)]"
                            : "text-[var(--text-secondary)]"
                        }`}
                      >
                        {money(o.totalAmount)}
                      </td>
                      <td className="px-3 py-2 text-center print:border print:border-black print:text-black">
                        {o.isWinner ? "🏆 Sim" : "—"}
                      </td>
                    </tr>
                  )
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function RelatorioCotacoesPage() {
  return (
    <ReportAccessGuard permission="purchase.report">
      <RelatorioCotacoesPageInner />
    </ReportAccessGuard>
  );
}
