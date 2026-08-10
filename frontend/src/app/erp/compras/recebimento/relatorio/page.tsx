"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Printer } from "lucide-react";

import {
  PURCHASE_STATUS_LABELS,
  formatPurchaseNumber,
  purchaseService,
  type Purchase,
} from "@/services/purchase.service";
import { PAYMENT_METHOD_LABELS } from "@/services/financial-entry.service";
import { companyService } from "@/services/company.service";
import { exportCsv } from "@/lib/exportCsv";

const STATUS_OPTIONS = ["APPROVED", "RECEIVED"] as const;

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

export default function RelatorioRecebimentosPage() {
  const [companyName, setCompanyName] = useState("");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<
    "APPROVED" | "RECEIVED" | ""
  >("RECEIVED");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [purchases, setPurchases] = useState<Purchase[]>([]);
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
      const result = await purchaseService.list({
        search: search || undefined,
        status: status || undefined,
      });

      setPurchases(result);
    } catch (err) {
      setError("Não foi possível carregar os recebimentos.");
      void err;
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 300);

    return () => clearTimeout(timer);
  }, [load]);

  const filtered = purchases.filter((p) => {
    if (
      status === "" &&
      p.status !== "APPROVED" &&
      p.status !== "RECEIVED"
    ) {
      return false;
    }

    const ref = p.invoiceIssueDate ?? p.purchaseDate;

    if (!ref) {
      return !startDate && !endDate;
    }

    const day = ref.slice(0, 10);

    if (startDate && day < startDate) {
      return false;
    }

    if (endDate && day > endDate) {
      return false;
    }

    return true;
  });

  function handleExport() {
    exportCsv(
      "relatorio-recebimentos",
      [
        "Número",
        "Fornecedor",
        "Nota fiscal",
        "Chave de acesso",
        "Emissão",
        "Vencimento",
        "Forma de pagamento",
        "Status",
        "Total",
      ],
      filtered.map((p) => [
        formatPurchaseNumber(p.number),
        p.partner?.tradeName || p.partner?.legalName || "",
        p.invoiceNumber ?? "",
        p.invoiceKey ?? "",
        date(p.invoiceIssueDate),
        date(p.dueDate),
        p.paymentMethod
          ? PAYMENT_METHOD_LABELS[p.paymentMethod]
          : "",
        PURCHASE_STATUS_LABELS[p.status],
        money(p.totalAmount),
      ])
    );
  }

  const today = new Date().toLocaleDateString("pt-BR");
  const total = filtered.reduce(
    (soma, p) => soma + num(p.totalAmount),
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
          href="/erp/compras/recebimento"
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
              placeholder="Número ou fornecedor..."
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
                  e.target.value as
                    | "APPROVED"
                    | "RECEIVED"
                    | ""
                )
              }
            >
              <option value="">
                Aprovadas e recebidas
              </option>

              {STATUS_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {PURCHASE_STATUS_LABELS[value]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>
              Emissão da nota — de
            </label>

            <input
              type="date"
              className={fieldClass}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass}>
              Emissão da nota — até
            </label>

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
          Relatório de Recebimentos
        </h1>

        <p className="text-sm text-[var(--text-muted)] print:text-black">
          {companyName} — gerado em {today} —{" "}
          {filtered.length}{" "}
          {filtered.length === 1
            ? "recebimento"
            : "recebimentos"}{" "}
          — total {money(total)}
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
                Fornecedor
              </th>
              <th className="px-3 py-2 font-semibold print:border print:border-black">
                Nota fiscal
              </th>
              <th className="px-3 py-2 font-semibold print:border print:border-black">
                Emissão
              </th>
              <th className="px-3 py-2 font-semibold print:border print:border-black">
                Vencimento
              </th>
              <th className="px-3 py-2 font-semibold print:border print:border-black">
                Status
              </th>
              <th className="px-3 py-2 text-right font-semibold print:border print:border-black">
                Total
              </th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-6 text-center text-[var(--text-muted)]"
                >
                  Carregando...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-6 text-center text-[var(--text-muted)]"
                >
                  Nenhum recebimento encontrado com esses
                  filtros.
                </td>
              </tr>
            ) : (
              filtered.map((p) => (
                <tr
                  key={p.id}
                  className="border-t border-[var(--border)] print:border-black"
                >
                  <td className="whitespace-nowrap px-3 py-2 text-[var(--text-secondary)] print:border print:border-black print:text-black">
                    {formatPurchaseNumber(p.number)}
                  </td>
                  <td className="px-3 py-2 font-medium text-[var(--text-primary)] print:border print:border-black print:text-black">
                    {p.partner?.tradeName ||
                      p.partner?.legalName ||
                      "—"}
                  </td>
                  <td className="px-3 py-2 text-[var(--text-secondary)] print:border print:border-black print:text-black">
                    {p.invoiceNumber || "—"}
                  </td>
                  <td className="px-3 py-2 text-[var(--text-secondary)] print:border print:border-black print:text-black">
                    {date(p.invoiceIssueDate)}
                  </td>
                  <td className="px-3 py-2 text-[var(--text-secondary)] print:border print:border-black print:text-black">
                    {date(p.dueDate)}
                  </td>
                  <td className="px-3 py-2 text-[var(--text-secondary)] print:border print:border-black print:text-black">
                    {PURCHASE_STATUS_LABELS[p.status]}
                  </td>
                  <td className="px-3 py-2 text-right font-medium text-[var(--text-primary)] print:border print:border-black print:text-black">
                    {money(p.totalAmount)}
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
