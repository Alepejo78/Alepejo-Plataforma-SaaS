"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";

import {
  employeeService,
  ppeDeliveryService,
  type Employee,
  type PpeDelivery,
} from "@/services/hr.service";

import { companyService, type Company } from "@/services/company.service";

function num(value: string | number | null | undefined) {
  return Number(value ?? 0);
}

function qty(value: string | number | null | undefined) {
  return num(value).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function date(value: string | null | undefined) {
  if (!value) {
    return "____/____/______";
  }

  return new Date(value).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
  });
}

export default function FichaEpiImpressaoPage() {
  const params = useParams<{ employeeId: string }>();
  const router = useRouter();

  const [employee, setEmployee] = useState<Employee | null>(
    null
  );
  const [deliveries, setDeliveries] = useState<PpeDelivery[]>(
    []
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
      ppeDeliveryService.list(employeeId),
      companyService.getMine(),
    ])
      .then(([emp, dels, comp]) => {
        setEmployee(emp);
        setDeliveries(dels);
        setCompany(comp);
      })
      .catch(() => {
        setError(
          "Não foi possível carregar a ficha deste colaborador."
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
          FICHA DE CONTROLE DE EPI
        </h1>

        <h2 className="text-center text-base font-semibold">
          EQUIPAMENTO DE PROTEÇÃO INDIVIDUAL (E.P.I)
        </h2>

        <div className="grid grid-cols-2 gap-x-6 gap-y-1 border border-black p-3">
          <p>
            <strong>FUNCIONÁRIO:</strong> {employee.name}
          </p>
          <p>
            <strong>SETOR:</strong>{" "}
            {employee.jobFunction?.sector?.name ?? "—"}
          </p>
          <p>
            <strong>RG:</strong> {employee.rg || "—"}
          </p>
          <p>
            <strong>CPF:</strong> {employee.cpf || "—"}
          </p>
          <p>
            <strong>FUNÇÃO:</strong>{" "}
            {employee.jobFunction?.name ?? "—"}
          </p>
          <p>
            <strong>CTPS:</strong> {employee.workCard || "—"}
            {employee.workCardSeries
              ? ` / Série ${employee.workCardSeries}`
              : ""}
          </p>
        </div>

        <p>
          Declaro, para os devidos fins, ter recebido os
          E.P.I.(s) abaixo relacionados, bem como as devidas
          orientações quanto a sua utilização, conservação e
          finalidade efetuadas pela{" "}
          <strong>{companyName}</strong>, em conformidade com
          a legislação vigente (Portaria 3214/78, NR-6, item
          6.7) e que estes se adaptam à preservação de minha
          integridade física e estão diretamente relacionados
          ao desempenho de minhas funções.
        </p>

        <p>
          Declaro, ainda, que estou ciente e de acordo que a
          perda e/ou má utilização dos itens abaixo
          relacionados implicará na restituição dos mesmos à{" "}
          <strong>{companyName}</strong>. Para tanto, autorizo
          o desconto em folha dos itens perdidos e/ou
          danificados nestas condições.
        </p>

        <p className="font-medium">
          De acordo, assino no campo correspondente após o
          recebimento de cada E.P.I.
        </p>

        <table className="w-full border-collapse border border-black text-xs">
          <thead>
            <tr>
              <th className="border border-black p-2">
                DATA
              </th>
              <th className="border border-black p-2">
                ESPECIFICAÇÃO
              </th>
              <th className="border border-black p-2">CA</th>
              <th className="border border-black p-2">
                QTDE
              </th>
              <th className="border border-black p-2">
                ASSINATURA
              </th>
            </tr>
          </thead>

          <tbody>
            {deliveries.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="border border-black p-4 text-center text-gray-500"
                >
                  Nenhuma entrega registrada.
                </td>
              </tr>
            ) : (
              deliveries.map((d) => (
                <tr key={d.id}>
                  <td className="border border-black p-2">
                    {date(d.deliveryDate)}
                  </td>
                  <td className="border border-black p-2">
                    {d.ppeType?.name ?? "—"}
                  </td>
                  <td className="border border-black p-2">
                    {d.ca || "—"}
                  </td>
                  <td className="border border-black p-2 text-right">
                    {qty(d.quantity)}
                  </td>
                  <td className="border border-black p-2" />
                </tr>
              ))
            )}

            {/* Linhas em branco pra novas entregas anotadas à mão. */}
            {Array.from({ length: 3 }).map((_, i) => (
              <tr key={`blank-${i}`}>
                <td className="border border-black p-4" />
                <td className="border border-black p-4" />
                <td className="border border-black p-4" />
                <td className="border border-black p-4" />
                <td className="border border-black p-4" />
              </tr>
            ))}
          </tbody>
        </table>

        <p className="pt-8 text-center">{companyName}</p>
      </div>
    </div>
  );
}
