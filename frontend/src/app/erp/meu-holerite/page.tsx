"use client";

import { useCallback, useEffect, useState } from "react";

import { AppShell } from "@/components";
import { PayslipDocument } from "@/components/payroll/PayslipDocument";
import { useAuth } from "@/providers/AuthProvider";
import { companyService } from "@/services/company.service";
import {
  payrollService,
  PAYROLL_CONFIRMATION_STATUS_LABELS,
  type MinePayrollItem,
} from "@/services/payroll.service";

function extractMessage(err: unknown, fallback: string) {
  const message = (
    err as { response?: { data?: { message?: unknown } } }
  )?.response?.data?.message;

  if (Array.isArray(message)) {
    return message.join(" ");
  }

  return typeof message === "string" ? message : fallback;
}

function money(value: string | number | null | undefined) {
  return Number(value ?? 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function date(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function competenceLabel(item: MinePayrollItem) {
  return `${MONTH_NAMES[item.payroll.competenceMonth - 1]}/${item.payroll.competenceYear}`;
}

export default function MeuHoleritePage() {
  const { user } = useAuth();

  const [companyName, setCompanyName] = useState("");
  const [companyDocument, setCompanyDocument] = useState("");
  const [items, setItems] = useState<MinePayrollItem[]>([]);
  const [selected, setSelected] = useState<MinePayrollItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await payrollService.getMineItems();

      setItems(result);
    } catch (err) {
      setError(
        extractMessage(
          err,
          "Não foi possível carregar seus holerites."
        )
      );
    } finally {
      setLoading(false);
    }
  }, []);

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

  const hourlyRate = selected
    ? selected.salaryType === "HORISTA"
      ? Number(selected.baseSalary)
      : Number(selected.baseSalary) / 220
    : 0;

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Meu Holerite
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Histórico dos seus holerites já pagos.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
            {error}
          </div>
        )}

        {loading ? (
          <div className="h-32 animate-pulse rounded-2xl bg-[var(--surface-hover)]" />
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--text-muted)]">
            Nenhum holerite pago ainda.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--surface-hover)]">
                <tr>
                  <th className="px-4 py-2 font-medium text-[var(--text-secondary)]">
                    Competência
                  </th>
                  <th className="px-4 py-2 font-medium text-[var(--text-secondary)]">
                    Líquido
                  </th>
                  <th className="px-4 py-2 font-medium text-[var(--text-secondary)]">
                    Confirmação
                  </th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-t border-[var(--border)]"
                  >
                    <td className="px-4 py-2 text-[var(--text-primary)]">
                      {competenceLabel(item)}
                    </td>
                    <td className="px-4 py-2 text-[var(--text-primary)]">
                      R$ {money(item.netAmount)}
                    </td>
                    <td className="px-4 py-2 text-[var(--text-secondary)]">
                      {PAYROLL_CONFIRMATION_STATUS_LABELS[item.confirmationStatus]}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => setSelected(item)}
                        className="text-sm font-medium text-[var(--primary)] hover:underline"
                      >
                        Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selected && (
          <PayslipDocument
            companyName={companyName}
            companyDocument={companyDocument}
            logoUrl={
              user?.company?.brandingLogoLightEnabled
                ? user.company.logo
                : undefined
            }
            confirmation={{
              status: selected.confirmationStatus,
              confirmedAt: selected.confirmedAt,
            }}
            title="Demonstrativo de Pagamento Mensal"
            periodLabel={`Período: ${String(selected.payroll.competenceMonth).padStart(2, "0")}/${selected.payroll.competenceYear}`}
            paymentDateLabel={
              selected.financialEntry
                ? `Data Pagto: ${date(selected.financialEntry.dueDate)}`
                : undefined
            }
            employee={selected.employee ?? { id: selected.employeeId, name: "—" }}
            baseSalary={Number(selected.baseSalary)}
            hourlyRate={hourlyRate}
            lines={selected.lines}
            footerFields={[
              { label: "Base I.N.S.S.", value: money(selected.inssBase) },
              { label: "F.G.T.S. do Mês", value: money(selected.employerFgtsAmount) },
              { label: "Base I.R.R.F.", value: money(selected.irrfBase) },
              { label: "Dep. I.R.R.F.", value: String(selected.dependentsCount) },
              { label: "Horas Extras no Mês", value: (selected.extraMinutes / 60).toFixed(2) },
              { label: "Faltas Injustificadas", value: `${selected.unjustifiedAbsenceDays} dia(s)` },
            ]}
          />
        )}
      </div>
    </AppShell>
  );
}
