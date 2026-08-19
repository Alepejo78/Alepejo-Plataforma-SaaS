"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { ReportAccessGuard } from "@/components/reports/ReportAccessGuard";
import { PayslipDocument } from "@/components/payroll/PayslipDocument";
import { companyService } from "@/services/company.service";
import {
  thirteenthSalaryService,
  type ThirteenthSalary,
  type ThirteenthSalaryItem,
} from "@/services/thirteenth-salary.service";

function date(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function ReciboContent() {
  const params = useParams<{ id: string; itemId: string }>();

  const [companyName, setCompanyName] = useState("");
  const [companyDocument, setCompanyDocument] = useState("");
  const [thirteenth, setThirteenth] = useState<ThirteenthSalary | null>(null);
  const [item, setItem] = useState<ThirteenthSalaryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [thirteenthData, itemData] = await Promise.all([
        thirteenthSalaryService.getById(params.id),
        thirteenthSalaryService.getItem(params.id, params.itemId),
      ]);

      setThirteenth(thirteenthData);
      setItem(itemData);
    } catch (err) {
      void err;
      setError("Não foi possível carregar o recibo.");
    } finally {
      setLoading(false);
    }
  }, [params.id, params.itemId]);

  useEffect(() => {
    companyService
      .getMine()
      .then((c) => {
        setCompanyName(c.tradeName || c.legalName || "");
        setCompanyDocument(c.document || "");
      })
      .catch(() => {});

    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="h-64 animate-pulse rounded-2xl bg-[var(--surface-hover)]" />
      </div>
    );
  }

  if (error || !thirteenth || !item) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
          {error || "Recibo não encontrado."}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mx-auto max-w-3xl px-6 pt-6 print:hidden">
        <Link
          href={`/erp/rh/decimo-terceiro/${thirteenth.id}`}
          className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={16} />
          Voltar
        </Link>
      </div>

      <PayslipDocument
        companyName={companyName}
        companyDocument={companyDocument}
        title={`Demonstrativo de 13º Salário — ${thirteenth.installment}ª Parcela`}
        periodLabel={`Ano: ${thirteenth.year}`}
        paymentDateLabel={
          item.financialEntry
            ? `Data Pagto: ${date(item.financialEntry.dueDate)}`
            : undefined
        }
        employee={item.employee ?? { id: item.employeeId, name: "—" }}
        baseSalary={Number(item.baseSalary)}
        lines={item.lines}
        footerFields={[
          { label: "Base I.N.S.S.", value: Number(item.inssBase).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) },
          { label: "F.G.T.S. do Período", value: Number(item.employerFgtsAmount).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) },
          { label: "Base I.R.R.F. 13º", value: Number(item.irrfBase).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) },
          { label: "Avos", value: `${item.monthsWorked}/12` },
          { label: "1ª Parcela Já Paga", value: Number(item.previousInstallmentAmount).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) },
        ]}
      />
    </div>
  );
}

export default function ReciboDecimoTerceiroPage() {
  return (
    <ReportAccessGuard permission="thirteenth-salary.report">
      <ReciboContent />
    </ReportAccessGuard>
  );
}
