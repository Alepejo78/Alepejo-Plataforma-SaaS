"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { ReportAccessGuard } from "@/components/reports/ReportAccessGuard";
import { PayslipDocument } from "@/components/payroll/PayslipDocument";
import { companyService } from "@/services/company.service";
import {
  payrollService,
  type Payroll,
  type PayrollItem,
} from "@/services/payroll.service";

function date(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function HoleriteContent() {
  const params = useParams<{ id: string; itemId: string }>();

  const [companyName, setCompanyName] = useState("");
  const [companyDocument, setCompanyDocument] = useState("");
  const [payroll, setPayroll] = useState<Payroll | null>(null);
  const [item, setItem] = useState<PayrollItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [payrollData, itemData] = await Promise.all([
        payrollService.getById(params.id),
        payrollService.getItem(params.id, params.itemId),
      ]);

      setPayroll(payrollData);
      setItem(itemData);
    } catch (err) {
      void err;
      setError("Não foi possível carregar o holerite.");
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

  if (error || !payroll || !item) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
          {error || "Holerite não encontrado."}
        </div>
      </div>
    );
  }

  const hourlyRate =
    item.salaryType === "HORISTA"
      ? Number(item.baseSalary)
      : Number(item.baseSalary) / 220;

  return (
    <div>
      <div className="mx-auto max-w-3xl px-6 pt-6 print:hidden">
        <Link
          href={`/erp/rh/folha/${payroll.id}`}
          className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={16} />
          Voltar
        </Link>
      </div>

      <PayslipDocument
        companyName={companyName}
        companyDocument={companyDocument}
        title="Demonstrativo de Pagamento Mensal"
        periodLabel={`Período: ${String(payroll.competenceMonth).padStart(2, "0")}/${payroll.competenceYear}`}
        paymentDateLabel={
          item.financialEntry
            ? `Data Pagto: ${date(item.financialEntry.dueDate)}`
            : undefined
        }
        employee={item.employee ?? { id: item.employeeId, name: "—" }}
        baseSalary={Number(item.baseSalary)}
        hourlyRate={hourlyRate}
        lines={item.lines}
        footerFields={[
          { label: "Base I.N.S.S.", value: Number(item.inssBase).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) },
          { label: "F.G.T.S. do Mês", value: Number(item.employerFgtsAmount).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) },
          { label: "Base I.R.R.F.", value: Number(item.irrfBase).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) },
          { label: "Dep. I.R.R.F.", value: String(item.dependentsCount) },
          { label: "Horas Extras no Mês", value: (item.extraMinutes / 60).toFixed(2) },
          { label: "Faltas Injustificadas", value: `${item.unjustifiedAbsenceDays} dia(s)` },
        ]}
      />
    </div>
  );
}

export default function HoleritePage() {
  return (
    <ReportAccessGuard permission="payroll.report">
      <HoleriteContent />
    </ReportAccessGuard>
  );
}
