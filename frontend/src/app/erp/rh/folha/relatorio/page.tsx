"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";

import { ReportAccessGuard } from "@/components/reports/ReportAccessGuard";
import { companyService } from "@/services/company.service";
import {
  payrollService,
  type ChargesBucket,
  type MonthlyCharges,
} from "@/services/payroll.service";

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

function money(value: number | null | undefined) {
  return Number(value ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

const fieldClass = `
  h-11 w-full rounded-xl border border-[var(--border)]
  bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)]
  outline-none transition-colors focus:border-[var(--primary)]
`;

const labelClass =
  "mb-1 block text-sm font-medium text-[var(--text-secondary)]";

function BucketRow({ label, bucket }: { label: string; bucket: ChargesBucket }) {
  return (
    <tr className="border-t border-[var(--border)] print:border-black">
      <td className="px-3 py-2 font-medium text-[var(--text-primary)] print:text-black">
        {label}
      </td>
      <td className="px-3 py-2 text-right text-[var(--text-secondary)] print:text-black">
        {bucket.count}
      </td>
      <td className="px-3 py-2 text-right text-[var(--text-secondary)] print:text-black">
        {money(bucket.totalGross)}
      </td>
      <td className="px-3 py-2 text-right text-[var(--text-secondary)] print:text-black">
        {money(bucket.totalInss)}
      </td>
      <td className="px-3 py-2 text-right text-[var(--text-secondary)] print:text-black">
        {money(bucket.totalIrrf)}
      </td>
      <td className="px-3 py-2 text-right text-[var(--text-secondary)] print:text-black">
        {money(bucket.totalFgts)}
      </td>
      <td className="px-3 py-2 text-right text-[var(--text-secondary)] print:text-black">
        {money(bucket.totalVt)}
      </td>
      <td className="px-3 py-2 text-right text-[var(--text-secondary)] print:text-black">
        {money(bucket.totalBenefits)}
      </td>
      <td className="px-3 py-2 text-right font-semibold text-[var(--text-primary)] print:text-black">
        {money(bucket.totalNet)}
      </td>
    </tr>
  );
}

function RelatorioEncargosPageInner() {
  return (
    <Suspense fallback={null}>
      <RelatorioEncargosContent />
    </Suspense>
  );
}

const now = new Date();

function RelatorioEncargosContent() {
  const searchParams = useSearchParams();

  const [companyName, setCompanyName] = useState("");
  const [year, setYear] = useState(
    Number(searchParams.get("year")) || now.getFullYear()
  );
  const [month, setMonth] = useState(
    Number(searchParams.get("month")) || now.getMonth() + 1
  );

  const [data, setData] = useState<MonthlyCharges | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    companyService
      .getMine()
      .then((c) => setCompanyName(c.tradeName || c.legalName || ""))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await payrollService.getMonthlyCharges(year, month);

      setData(result);
    } catch (err) {
      void err;
      setError("Não foi possível carregar o relatório.");
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    void load();
  }, [load]);

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
          href="/erp/rh/folha"
          className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={16} />
          Voltar
        </Link>

        <button
          type="button"
          onClick={() => window.print()}
          disabled={!data}
          className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-50"
        >
          <Printer size={18} />
          Imprimir
        </button>
      </div>

      <div className="mb-6 grid max-w-md grid-cols-2 gap-4 print:hidden">
        <div>
          <label className={labelClass}>Ano</label>

          <input
            type="number"
            className={fieldClass}
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          />
        </div>

        <div>
          <label className={labelClass}>Mês</label>

          <select
            className={fieldClass}
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          >
            {MONTH_LABELS.map((label, i) => (
              <option key={label} value={i + 1}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <h1 className="text-xl font-bold text-[var(--text-primary)] print:text-black">
          Relatório Consolidado de Encargos — {MONTH_LABELS[month - 1]} /{" "}
          {year}
        </h1>

        <p className="text-sm text-[var(--text-muted)] print:text-black">
          {companyName} — gerado em {today}
        </p>

        <p className="text-sm text-[var(--text-muted)] print:text-black">
          Folha mensal pela competência informada; 13º salário e Férias
          entram pelo mês em que foram aprovados (é quando o encargo
          passa a existir de fato).
        </p>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)] print:hidden">
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-4 h-48 animate-pulse rounded-2xl bg-[var(--surface-hover)]" />
      ) : data ? (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-[var(--border)] print:rounded-none print:border-black">
          <table className="w-full text-left text-sm print:text-xs">
            <thead className="bg-[var(--surface-hover)] text-[var(--text-secondary)] print:bg-transparent print:text-black">
              <tr>
                <th className="px-3 py-2 font-semibold print:border print:border-black">
                  Origem
                </th>
                <th className="px-3 py-2 text-right font-semibold print:border print:border-black">
                  Itens
                </th>
                <th className="px-3 py-2 text-right font-semibold print:border print:border-black">
                  Bruto
                </th>
                <th className="px-3 py-2 text-right font-semibold print:border print:border-black">
                  INSS
                </th>
                <th className="px-3 py-2 text-right font-semibold print:border print:border-black">
                  IRRF
                </th>
                <th className="px-3 py-2 text-right font-semibold print:border print:border-black">
                  FGTS
                </th>
                <th className="px-3 py-2 text-right font-semibold print:border print:border-black">
                  Vale Transporte
                </th>
                <th className="px-3 py-2 text-right font-semibold print:border print:border-black">
                  Benefícios
                </th>
                <th className="px-3 py-2 text-right font-semibold print:border print:border-black">
                  Líquido pago
                </th>
              </tr>
            </thead>

            <tbody>
              <BucketRow label="Folha mensal" bucket={data.payroll} />
              <BucketRow label="13º salário" bucket={data.thirteenthSalary} />
              <BucketRow label="Férias" bucket={data.vacation} />

              <tr className="border-t-2 border-[var(--border-strong)] bg-[var(--surface-hover)] print:border-black print:bg-transparent">
                <td className="px-3 py-2 font-bold text-[var(--text-primary)] print:text-black">
                  Total
                </td>
                <td className="px-3 py-2 text-right font-bold text-[var(--text-primary)] print:text-black">
                  {data.consolidated.count}
                </td>
                <td className="px-3 py-2 text-right font-bold text-[var(--text-primary)] print:text-black">
                  {money(data.consolidated.totalGross)}
                </td>
                <td className="px-3 py-2 text-right font-bold text-[var(--text-primary)] print:text-black">
                  {money(data.consolidated.totalInss)}
                </td>
                <td className="px-3 py-2 text-right font-bold text-[var(--text-primary)] print:text-black">
                  {money(data.consolidated.totalIrrf)}
                </td>
                <td className="px-3 py-2 text-right font-bold text-[var(--text-primary)] print:text-black">
                  {money(data.consolidated.totalFgts)}
                </td>
                <td className="px-3 py-2 text-right font-bold text-[var(--text-primary)] print:text-black">
                  {money(data.consolidated.totalVt)}
                </td>
                <td className="px-3 py-2 text-right font-bold text-[var(--text-primary)] print:text-black">
                  {money(data.consolidated.totalBenefits)}
                </td>
                <td className="px-3 py-2 text-right font-bold text-[var(--text-primary)] print:text-black">
                  {money(data.consolidated.totalNet)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

export default function RelatorioEncargosPage() {
  return (
    <ReportAccessGuard permission="payroll.report">
      <RelatorioEncargosPageInner />
    </ReportAccessGuard>
  );
}
