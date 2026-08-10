"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";

import {
  employeeService,
  SALARY_TYPE_LABELS,
  type Employee,
} from "@/services/hr.service";

import { companyService, type Company } from "@/services/company.service";
import { currencyToWordsPtBr } from "@/lib/currencyToWords";

function date(value: string | null | undefined) {
  if (!value) {
    return "____/____/______";
  }

  return new Date(value).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
  });
}

function money(value: string | number | null | undefined) {
  const n = Number(value ?? 0);

  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function EtiquetaCtpsImpressaoPage() {
  const params = useParams<{ employeeId: string }>();
  const router = useRouter();

  const [employee, setEmployee] = useState<Employee | null>(
    null
  );
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const employeeId = params.employeeId;

    if (!employeeId) {
      return;
    }

    setLoading(true);

    Promise.all([
      employeeService.getById(employeeId),
      companyService.getMine(),
    ])
      .then(([emp, comp]) => {
        setEmployee(emp);
        setCompany(comp);
      })
      .catch(() => {
        setError(
          "Não foi possível carregar os dados deste colaborador."
        );
      })
      .finally(() => setLoading(false));
  }, [params.employeeId]);

  const companyName =
    company?.tradeName || company?.legalName || "";

  if (loading) {
    return (
      <div className="p-10 text-center text-[var(--text-muted)]">
        Carregando...
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="p-10 text-center text-[var(--danger)]">
        {error || "Colaborador não encontrado."}
      </div>
    );
  }

  const salaryWords = employee.baseSalary
    ? currencyToWordsPtBr(Number(employee.baseSalary))
    : null;

  return (
    <div className="mx-auto max-w-3xl bg-white p-8 text-black print:p-0">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-black"
        >
          <ArrowLeft size={16} />
          Voltar
        </button>

        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"
        >
          <Printer size={18} />
          Imprimir
        </button>
      </div>

      <div className="space-y-4 text-sm leading-relaxed">
        <h1 className="text-center text-lg font-bold">
          ETIQUETA DE ANOTAÇÃO — CARTEIRA DE TRABALHO
        </h1>

        <p className="text-center font-semibold">
          {companyName}
          {company?.document ? ` — CNPJ ${company.document}` : ""}
        </p>

        <div className="grid grid-cols-2 gap-x-6 gap-y-1 border border-black p-3">
          <p>
            <strong>FUNCIONÁRIO:</strong> {employee.name}
          </p>
          <p>
            <strong>CTPS:</strong> {employee.workCard || "—"}
            {employee.workCardSeries
              ? ` / Série ${employee.workCardSeries}`
              : ""}
          </p>
          <p>
            <strong>FUNÇÃO:</strong>{" "}
            {employee.jobFunction?.name ?? "—"}
          </p>
          <p>
            <strong>PIS:</strong> {employee.pis || "—"}
          </p>
          <p>
            <strong>SETOR:</strong>{" "}
            {employee.jobFunction?.sector?.name ?? "—"}
          </p>
          <p>
            <strong>DATA DE ADMISSÃO:</strong>{" "}
            {date(employee.admissionDate)}
          </p>
          <p className="col-span-2">
            <strong>HORÁRIO DE TRABALHO:</strong>{" "}
            {employee.workSchedule?.description ||
              employee.workSchedule?.name ||
              "—"}
          </p>
        </div>

        <div className="border border-black p-3">
          <p>
            <strong>SALÁRIO:</strong>{" "}
            {money(employee.baseSalary)}
            {employee.salaryType
              ? ` (${SALARY_TYPE_LABELS[employee.salaryType]})`
              : ""}
          </p>

          {salaryWords && (
            <p className="mt-1">
              <strong>POR EXTENSO:</strong> {salaryWords}
            </p>
          )}
        </div>

        <p className="pt-6 text-center">
          {companyName} — {date(new Date().toISOString())}
        </p>
      </div>
    </div>
  );
}
