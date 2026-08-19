"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { ReportAccessGuard } from "@/components/reports/ReportAccessGuard";
import { PayslipDocument } from "@/components/payroll/PayslipDocument";
import { companyService } from "@/services/company.service";
import {
  vacationService,
  type VacationGrant,
} from "@/services/vacation.service";

function date(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function ReciboContent() {
  const params = useParams<{ id: string }>();

  const [companyName, setCompanyName] = useState("");
  const [companyDocument, setCompanyDocument] = useState("");
  const [grant, setGrant] = useState<VacationGrant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await vacationService.getById(params.id);

      setGrant(data);
    } catch (err) {
      void err;
      setError("Não foi possível carregar o recibo.");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

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

  if (error || !grant) {
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
          href="/erp/rh/ferias"
          className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={16} />
          Voltar
        </Link>
      </div>

      <PayslipDocument
        companyName={companyName}
        companyDocument={companyDocument}
        title="Recibo de Férias"
        periodLabel={`Gozo: ${date(grant.startDate)} a ${date(grant.endDate)}`}
        paymentDateLabel={`Retorno: ${date(grant.returnDate)}`}
        employee={grant.employee ?? { id: grant.employeeId, name: "—" }}
        baseSalary={Number(grant.baseSalary)}
        lines={grant.lines}
        footerFields={[
          { label: "Base I.N.S.S.", value: Number(grant.inssBase).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) },
          { label: "F.G.T.S. do Período", value: Number(grant.employerFgtsAmount).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) },
          { label: "Base I.R.R.F.", value: Number(grant.irrfBase).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) },
          { label: "Dias de Descanso", value: String(grant.days) },
          { label: "Dias Vendidos (abono)", value: String(grant.soldDays) },
        ]}
      />
    </div>
  );
}

export default function ReciboFeriasPage() {
  return (
    <ReportAccessGuard permission="vacation.report">
      <ReciboContent />
    </ReportAccessGuard>
  );
}
