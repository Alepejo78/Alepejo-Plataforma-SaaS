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
  type PayrollConfirmationStatus,
} from "@/services/payroll.service";
import {
  vacationService,
  type VacationGrant,
} from "@/services/vacation.service";
import {
  thirteenthSalaryService,
  type MineThirteenthItem,
} from "@/services/thirteenth-salary.service";

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

type Row =
  | { kind: "FOLHA"; item: MinePayrollItem }
  | { kind: "FERIAS"; item: VacationGrant }
  | { kind: "13"; item: MineThirteenthItem };

const KIND_LABELS: Record<Row["kind"], string> = {
  FOLHA: "Holerite",
  FERIAS: "Férias",
  "13": "13º Salário",
};

function rowKey(row: Row) {
  return `${row.kind}-${row.item.id}`;
}

function rowLabel(row: Row) {
  if (row.kind === "FOLHA") {
    return `${MONTH_NAMES[row.item.payroll.competenceMonth - 1]}/${row.item.payroll.competenceYear}`;
  }

  if (row.kind === "FERIAS") {
    return `Gozo ${date(row.item.startDate)} a ${date(row.item.endDate)}`;
  }

  return `${row.item.thirteenthSalary.installment}ª parcela/${row.item.thirteenthSalary.year}`;
}

function rowSortDate(row: Row) {
  if (row.kind === "FOLHA") {
    return new Date(row.item.payroll.competenceYear, row.item.payroll.competenceMonth - 1, 1).getTime();
  }

  if (row.kind === "FERIAS") {
    return new Date(row.item.startDate).getTime();
  }

  return new Date(row.item.thirteenthSalary.year, row.item.thirteenthSalary.installment === 1 ? 10 : 11, 1).getTime();
}

function rowNetAmount(row: Row) {
  return row.item.netAmount;
}

function rowConfirmationStatus(row: Row): PayrollConfirmationStatus {
  return row.item.confirmationStatus;
}

export default function MeuHoleritePage() {
  const { user } = useAuth();

  const [companyName, setCompanyName] = useState("");
  const [companyDocument, setCompanyDocument] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [selected, setSelected] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmingKey, setConfirmingKey] = useState("");
  const [actionError, setActionError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [payrollItems, vacationGrants, thirteenthItems] = await Promise.all([
        payrollService.getMineItems(),
        vacationService.getMineGrants(),
        thirteenthSalaryService.getMineItems(),
      ]);

      const combined: Row[] = [
        ...payrollItems.map((item): Row => ({ kind: "FOLHA", item })),
        ...vacationGrants
          .filter((g) => g.status === "APPROVED")
          .map((item): Row => ({ kind: "FERIAS", item })),
        ...thirteenthItems.map((item): Row => ({ kind: "13", item })),
      ].sort((a, b) => rowSortDate(b) - rowSortDate(a));

      setRows(combined);
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

  async function handleConfirm(row: Row) {
    if (
      !window.confirm(
        "Confirmar recebimento? Isso registra a data/hora e vale como assinatura digital."
      )
    ) {
      return;
    }

    setConfirmingKey(rowKey(row));
    setActionError("");

    try {
      if (row.kind === "FOLHA") {
        await payrollService.confirmMine(row.item.id);
      } else if (row.kind === "FERIAS") {
        await vacationService.confirmMineGrant(row.item.id);
      } else {
        await thirteenthSalaryService.confirmMine(
          row.item.thirteenthSalaryId,
          row.item.id
        );
      }

      setSelected(null);
      await load();
    } catch (err) {
      setActionError(
        extractMessage(err, "Não foi possível confirmar o recebimento.")
      );
    } finally {
      setConfirmingKey("");
    }
  }

  const hourlyRate =
    selected?.kind === "FOLHA"
      ? selected.item.salaryType === "HORISTA"
        ? Number(selected.item.baseSalary)
        : Number(selected.item.baseSalary) / 220
      : 0;

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Meu Holerite
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Histórico de holerite, férias e 13º já pagos — veja, imprima e confirme o recebimento.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
            {error}
          </div>
        )}

        {actionError && (
          <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
            {actionError}
          </div>
        )}

        {loading ? (
          <div className="h-32 animate-pulse rounded-2xl bg-[var(--surface-hover)]" />
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--text-muted)]">
            Nenhum holerite, férias ou 13º pago ainda.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--surface-hover)]">
                <tr>
                  <th className="px-4 py-2 font-medium text-[var(--text-secondary)]">
                    Tipo
                  </th>
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
                {rows.map((row) => (
                  <tr
                    key={rowKey(row)}
                    className="border-t border-[var(--border)]"
                  >
                    <td className="px-4 py-2 text-[var(--text-secondary)]">
                      {KIND_LABELS[row.kind]}
                    </td>
                    <td className="px-4 py-2 text-[var(--text-primary)]">
                      {rowLabel(row)}
                    </td>
                    <td className="px-4 py-2 text-[var(--text-primary)]">
                      R$ {money(rowNetAmount(row))}
                    </td>
                    <td className="px-4 py-2 text-[var(--text-secondary)]">
                      {PAYROLL_CONFIRMATION_STATUS_LABELS[rowConfirmationStatus(row)]}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => setSelected(row)}
                          className="text-sm font-medium text-[var(--primary)] hover:underline"
                        >
                          Ver
                        </button>

                        {rowConfirmationStatus(row) === "PENDENTE" && (
                          <button
                            type="button"
                            disabled={confirmingKey === rowKey(row)}
                            onClick={() => void handleConfirm(row)}
                            className="text-sm font-medium text-[var(--success)] hover:underline disabled:opacity-50"
                          >
                            Confirmar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selected && selected.kind === "FOLHA" && (
          <PayslipDocument
            companyName={companyName}
            companyDocument={companyDocument}
            logoUrl={
              user?.company?.brandingLogoLightEnabled
                ? user.company.logo
                : undefined
            }
            confirmation={{
              status: selected.item.confirmationStatus,
              confirmedAt: selected.item.confirmedAt,
            }}
            title="Demonstrativo de Pagamento Mensal"
            periodLabel={`Período: ${String(selected.item.payroll.competenceMonth).padStart(2, "0")}/${selected.item.payroll.competenceYear}`}
            paymentDateLabel={
              selected.item.financialEntry
                ? `Data Pagto: ${date(selected.item.financialEntry.dueDate)}`
                : undefined
            }
            employee={selected.item.employee ?? { id: selected.item.employeeId, name: "—" }}
            baseSalary={Number(selected.item.baseSalary)}
            hourlyRate={hourlyRate}
            lines={selected.item.lines}
            footerFields={[
              { label: "Base I.N.S.S.", value: money(selected.item.inssBase) },
              { label: "F.G.T.S. do Mês", value: money(selected.item.employerFgtsAmount) },
              { label: "Base I.R.R.F.", value: money(selected.item.irrfBase) },
              { label: "Dep. I.R.R.F.", value: String(selected.item.dependentsCount) },
              { label: "Horas Extras no Mês", value: (selected.item.extraMinutes / 60).toFixed(2) },
              { label: "Faltas Injustificadas", value: `${selected.item.unjustifiedAbsenceDays} dia(s)` },
            ]}
          />
        )}

        {selected && selected.kind === "FERIAS" && (
          <PayslipDocument
            companyName={companyName}
            companyDocument={companyDocument}
            logoUrl={
              user?.company?.brandingLogoLightEnabled
                ? user.company.logo
                : undefined
            }
            confirmation={{
              status: selected.item.confirmationStatus,
              confirmedAt: selected.item.confirmedAt,
            }}
            title="Recibo de Férias"
            periodLabel={`Gozo: ${date(selected.item.startDate)} a ${date(selected.item.endDate)}`}
            paymentDateLabel={`Retorno: ${date(selected.item.returnDate)}`}
            employee={selected.item.employee ?? { id: selected.item.employeeId, name: "—" }}
            baseSalary={Number(selected.item.baseSalary)}
            lines={selected.item.lines}
            footerFields={[
              { label: "Base I.N.S.S.", value: money(selected.item.inssBase) },
              { label: "F.G.T.S. do Período", value: money(selected.item.employerFgtsAmount) },
              { label: "Base I.R.R.F.", value: money(selected.item.irrfBase) },
              { label: "Dias de Descanso", value: String(selected.item.days) },
              { label: "Dias Vendidos (abono)", value: String(selected.item.soldDays) },
            ]}
          />
        )}

        {selected && selected.kind === "13" && (
          <PayslipDocument
            companyName={companyName}
            companyDocument={companyDocument}
            logoUrl={
              user?.company?.brandingLogoLightEnabled
                ? user.company.logo
                : undefined
            }
            confirmation={{
              status: selected.item.confirmationStatus,
              confirmedAt: selected.item.confirmedAt,
            }}
            title={`Demonstrativo de 13º Salário — ${selected.item.thirteenthSalary.installment}ª Parcela`}
            periodLabel={`Ano: ${selected.item.thirteenthSalary.year}`}
            paymentDateLabel={
              selected.item.financialEntry
                ? `Data Pagto: ${date(selected.item.financialEntry.dueDate)}`
                : undefined
            }
            employee={selected.item.employee ?? { id: selected.item.employeeId, name: "—" }}
            baseSalary={Number(selected.item.baseSalary)}
            lines={selected.item.lines}
            footerFields={[
              { label: "Base I.N.S.S.", value: money(selected.item.inssBase) },
              { label: "F.G.T.S. do Período", value: money(selected.item.employerFgtsAmount) },
              { label: "Base I.R.R.F. 13º", value: money(selected.item.irrfBase) },
              { label: "Avos", value: `${selected.item.monthsWorked}/12` },
              { label: "1ª Parcela Já Paga", value: money(selected.item.previousInstallmentAmount) },
            ]}
          />
        )}
      </div>
    </AppShell>
  );
}
