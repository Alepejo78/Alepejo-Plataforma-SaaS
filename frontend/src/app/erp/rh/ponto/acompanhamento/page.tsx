"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Printer } from "lucide-react";

import { SearchSelect } from "@/components/ui/SearchSelect";
import { companyService } from "@/services/company.service";
import { exportCsv } from "@/lib/exportCsv";
import { useAuth } from "@/providers/AuthProvider";

import {
  employeeService,
  type Employee,
} from "@/services/hr.service";

import {
  ABSENCE_TYPE_LABELS,
  absenceRecordService,
  minutesToLabel,
  timeEntryService,
  type AbsenceType,
  type DaySlots,
  type HourBankSummary,
} from "@/services/time-tracking.service";

type RowType = "WORKED" | AbsenceType;

const ROW_TYPE_LABELS: Record<RowType, string> = {
  WORKED: "Trabalhado",
  ...ABSENCE_TYPE_LABELS,
};

interface TrackingRow {
  employeeId: string;
  employeeName: string;
  date: string;
  type: RowType;
  slots: DaySlots;
  workedMinutes: number;
  extraMinutes: number;
  compensatedMinutes: number;
  hasAdjustment: boolean;
  status?: "PENDING" | "APPROVED";
}

function timeLabel(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

function dateLabel(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(
    "pt-BR",
    { timeZone: "UTC" }
  );
}

function currentMonthValue() {
  const now = new Date();

  return `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}`;
}

function monthBounds(monthValue: string) {
  const [y, m] = monthValue.split("-").map(Number);
  const from = `${monthValue}-01`;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const to = `${monthValue}-${String(lastDay).padStart(2, "0")}`;

  return { from, to };
}

function monthName(monthValue: string) {
  const [y, m] = monthValue.split("-").map(Number);

  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(
    "pt-BR",
    { month: "long", year: "numeric", timeZone: "UTC" }
  );
}

const fieldClass = `
  h-11 w-full rounded-xl border border-[var(--border)]
  bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)]
  outline-none transition-colors focus:border-[var(--primary)]
`;

const labelClass =
  "mb-1 block text-sm font-medium text-[var(--text-secondary)]";

function IndicatorCard({
  title,
  value,
  tone,
}: {
  title: string;
  value: string;
  tone: "success" | "danger" | "neutral";
}) {
  const toneClass =
    tone === "success"
      ? "text-[var(--success)]"
      : tone === "danger"
        ? "text-[var(--danger)]"
        : "text-[var(--text-primary)]";

  return (
    <div className="rounded-2xl border border-[var(--border)] p-4 print:border-black">
      <p className="text-xs text-[var(--text-muted)] print:text-black">
        {title}
      </p>
      <p className={`mt-1 text-2xl font-bold ${toneClass} print:text-black`}>
        {value}
      </p>
    </div>
  );
}

export default function AcompanhamentoDeHorasPage() {
  const { can } = useAuth();
  // Sem `employee.view` (não é RH/admin) o backend já força pro
  // próprio colaborador (ver resolveViewableEmployeeId) — aqui só
  // pula a busca e abre direto no próprio acompanhamento.
  const isSelfService = !can("employee.view");

  const [companyName, setCompanyName] = useState("");

  const [employeeId, setEmployeeId] = useState("");
  const [employeeLabel, setEmployeeLabel] = useState("");
  const [month, setMonth] = useState(currentMonthValue());

  const [rows, setRows] = useState<TrackingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [hourBankSummary, setHourBankSummary] =
    useState<HourBankSummary | null>(null);

  useEffect(() => {
    companyService
      .getMine()
      .then((c) => setCompanyName(c.tradeName || c.legalName || ""))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isSelfService) {
      return;
    }

    employeeService
      .getMine()
      .then((own) => {
        setEmployeeId(own.id);
        setEmployeeLabel(own.name);
      })
      .catch(() => {
        // sem colaborador vinculado — segue sem pré-selecionar
      });
  }, [isSelfService]);

  const searchEmployees = useCallback(async (query: string) => {
    const result = await employeeService.list({
      search: query || undefined,
      limit: 20,
    });

    return result;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { from, to } = monthBounds(month);

      const [summaries, absences] = await Promise.all([
        timeEntryService.getDaySummary({
          employeeId: employeeId || undefined,
          from,
          to,
        }),
        absenceRecordService.list({
          employeeId: employeeId || undefined,
          status: "APROVADO",
          from,
          to,
        }),
      ]);

      const summaryKeys = new Set(
        summaries.map((s) => `${s.employeeId}_${s.date}`)
      );

      const workedRows: TrackingRow[] = summaries.map((s) => ({
        employeeId: s.employeeId,
        employeeName: s.employeeName,
        date: s.date,
        type: "WORKED",
        slots: s.slots,
        workedMinutes: s.workedMinutes,
        extraMinutes: s.extraMinutes,
        compensatedMinutes: s.compensatedMinutes,
        hasAdjustment: s.hasAdjustment,
        status: s.status,
      }));

      const absenceRows: TrackingRow[] = absences
        .filter(
          (a) =>
            !summaryKeys.has(
              `${a.employeeId}_${a.date.slice(0, 10)}`
            )
        )
        .map((a) => ({
          employeeId: a.employeeId,
          employeeName: a.employee?.name ?? "",
          date: a.date.slice(0, 10),
          type: a.type,
          slots: {
            start: null,
            breakStart: null,
            breakEnd: null,
            end: null,
          },
          workedMinutes: 0,
          extraMinutes: 0,
          compensatedMinutes: 0,
          hasAdjustment: false,
        }));

      setRows(
        [...workedRows, ...absenceRows].sort(
          (a, b) =>
            a.date.localeCompare(b.date) ||
            a.employeeName.localeCompare(b.employeeName)
        )
      );
    } catch (err) {
      void err;
      setError(
        "Não foi possível carregar o acompanhamento de horas."
      );
    } finally {
      setLoading(false);
    }
  }, [employeeId, month]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!employeeId) {
      setHourBankSummary(null);
      return;
    }

    timeEntryService
      .getHourBankSummary(employeeId)
      .then((summary) =>
        setHourBankSummary(summary.hourBankEnabled ? summary : null)
      )
      .catch(() => setHourBankSummary(null));
  }, [employeeId]);

  const totalPositive = rows.reduce(
    (sum, r) => sum + r.extraMinutes,
    0
  );
  const totalCompensated = rows.reduce(
    (sum, r) => sum + r.compensatedMinutes,
    0
  );
  const saldo = totalPositive - totalCompensated;

  function handleExport() {
    exportCsv(
      "acompanhamento-horas",
      [
        "Data",
        "Colaborador",
        "Tipo",
        "Início",
        "Início intervalo",
        "Fim intervalo",
        "Saída",
        "Horas trabalhadas",
        "Extras",
        "Compensado",
        "Ajustada",
        "Status",
      ],
      rows.map((r) => [
        dateLabel(r.date),
        r.employeeName,
        ROW_TYPE_LABELS[r.type],
        timeLabel(r.slots.start),
        timeLabel(r.slots.breakStart),
        timeLabel(r.slots.breakEnd),
        timeLabel(r.slots.end),
        minutesToLabel(r.workedMinutes),
        r.extraMinutes > 0 ? minutesToLabel(r.extraMinutes) : "",
        r.compensatedMinutes > 0
          ? minutesToLabel(r.compensatedMinutes)
          : "",
        r.hasAdjustment ? "Sim" : "Não",
        r.status === "APPROVED"
          ? "Aprovado"
          : r.status === "PENDING"
            ? "Pendente"
            : "",
      ])
    );
  }

  const canPrint = !!employeeId && rows.length > 0;

  return (
    <div className="mx-auto max-w-6xl p-6 print:max-w-none print:p-0">
      <style>{`
        @media print {
          @page { size: landscape; margin: 12mm; }
        }
      `}</style>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href="/erp/rh/ponto"
          className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={16} />
          Voltar
        </Link>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={rows.length === 0}
            className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] disabled:opacity-50"
          >
            <Download size={18} />
            Exportar CSV
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            disabled={!canPrint}
            title={
              !employeeId
                ? "Selecione um colaborador pra imprimir a folha de assinatura"
                : undefined
            }
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-50"
          >
            <Printer size={18} />
            Imprimir folha
          </button>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-[var(--border)] p-4 print:hidden">
        <p className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
          Filtros
        </p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {!isSelfService && (
            <div>
              <label className={labelClass}>Colaborador</label>

              <SearchSelect<Employee>
                displayLabel={employeeLabel}
                search={searchEmployees}
                getId={(e) => e.id}
                getLabel={(e) => e.name}
                placeholder="Todos os colaboradores"
                onSelect={(e) => {
                  setEmployeeId(e?.id ?? "");
                  setEmployeeLabel(e?.name ?? "");
                }}
              />
            </div>
          )}

          <div>
            <label className={labelClass}>Mês</label>

            <input
              type="month"
              className={fieldClass}
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="space-y-1 print:hidden">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">
          Acompanhamento de horas
        </h1>

        <p className="text-sm text-[var(--text-muted)]">
          {employeeLabel || "Todos os colaboradores"} —{" "}
          {monthName(month)}
        </p>
      </div>

      <div className="mt-2 hidden print:block">
        <h1 className="text-xl font-bold text-black">
          Folha de registro de ponto
        </h1>
        <p className="text-sm text-black">
          {companyName} — {employeeLabel} — {monthName(month)}
        </p>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)] print:hidden">
          {error}
        </div>
      )}

      <div
        className={`mt-4 grid gap-3 sm:grid-cols-3 ${hourBankSummary ? "lg:grid-cols-4" : ""}`}
      >
        <IndicatorCard
          title="Total de horas positivas (mês)"
          value={minutesToLabel(totalPositive)}
          tone="success"
        />
        <IndicatorCard
          title="Total de horas compensadas (mês)"
          value={minutesToLabel(totalCompensated)}
          tone="danger"
        />
        <IndicatorCard
          title="Saldo do mês"
          value={`${saldo >= 0 ? "+" : "-"}${minutesToLabel(Math.abs(saldo))}`}
          tone={saldo >= 0 ? "success" : "danger"}
        />
        {hourBankSummary && (
          <IndicatorCard
            title={`Banco de horas acumulado${
              hourBankSummary.hourBankClosingDate
                ? ` (fecha em ${dateLabel(hourBankSummary.hourBankClosingDate.slice(0, 10))})`
                : ""
            }`}
            value={`${hourBankSummary.accumulatedMinutes >= 0 ? "+" : "-"}${minutesToLabel(Math.abs(hourBankSummary.accumulatedMinutes))}`}
            tone={
              hourBankSummary.accumulatedMinutes >= 0
                ? "success"
                : "neutral"
            }
          />
        )}
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-[var(--border)] print:rounded-none print:border-black">
        <table className="w-full text-left text-sm print:text-xs">
          <thead className="bg-[var(--surface-hover)] text-[var(--text-secondary)] print:bg-transparent print:text-black">
            <tr>
              <th className="px-3 py-2 font-semibold print:border print:border-black">
                Data
              </th>
              <th className="px-3 py-2 font-semibold print:border print:border-black">
                Colaborador
              </th>
              <th className="px-3 py-2 font-semibold print:border print:border-black">
                Tipo
              </th>
              <th className="px-3 py-2 font-semibold print:border print:border-black">
                Início
              </th>
              <th className="px-3 py-2 font-semibold print:border print:border-black">
                Int. início
              </th>
              <th className="px-3 py-2 font-semibold print:border print:border-black">
                Int. fim
              </th>
              <th className="px-3 py-2 font-semibold print:border print:border-black">
                Saída
              </th>
              <th className="px-3 py-2 text-right font-semibold print:border print:border-black">
                Trabalhadas
              </th>
              <th className="px-3 py-2 text-right font-semibold print:border print:border-black">
                Extras
              </th>
              <th className="px-3 py-2 text-right font-semibold print:border print:border-black">
                Compensado
              </th>
              <th className="px-3 py-2 font-semibold print:border print:border-black">
                Ajustada
              </th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={11}
                  className="px-3 py-6 text-center text-[var(--text-muted)]"
                >
                  Carregando...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={11}
                  className="px-3 py-6 text-center text-[var(--text-muted)]"
                >
                  Nenhum registro encontrado nesse período.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={`${r.employeeId}_${r.date}`}
                  className="border-t border-[var(--border)] print:border-black"
                >
                  <td className="whitespace-nowrap px-3 py-2 text-[var(--text-secondary)] print:border print:border-black print:text-black">
                    {dateLabel(r.date)}
                  </td>
                  <td className="px-3 py-2 font-medium text-[var(--text-primary)] print:border print:border-black print:text-black">
                    {r.employeeName}
                  </td>
                  <td className="px-3 py-2 text-[var(--text-secondary)] print:border print:border-black print:text-black">
                    {ROW_TYPE_LABELS[r.type]}
                  </td>
                  <td className="px-3 py-2 text-[var(--text-secondary)] print:border print:border-black print:text-black">
                    {timeLabel(r.slots.start)}
                  </td>
                  <td className="px-3 py-2 text-[var(--text-secondary)] print:border print:border-black print:text-black">
                    {timeLabel(r.slots.breakStart)}
                  </td>
                  <td className="px-3 py-2 text-[var(--text-secondary)] print:border print:border-black print:text-black">
                    {timeLabel(r.slots.breakEnd)}
                  </td>
                  <td className="px-3 py-2 text-[var(--text-secondary)] print:border print:border-black print:text-black">
                    {timeLabel(r.slots.end)}
                  </td>
                  <td className="px-3 py-2 text-right text-[var(--text-secondary)] print:border print:border-black print:text-black">
                    {minutesToLabel(r.workedMinutes)}
                  </td>
                  <td className="px-3 py-2 text-right text-[var(--warning)] print:border print:border-black print:text-black">
                    {r.extraMinutes > 0
                      ? minutesToLabel(r.extraMinutes)
                      : "—"}
                  </td>
                  <td className="px-3 py-2 text-right text-[var(--danger)] print:border print:border-black print:text-black">
                    {r.compensatedMinutes > 0
                      ? minutesToLabel(r.compensatedMinutes)
                      : "—"}
                  </td>
                  <td className="px-3 py-2 text-[var(--text-secondary)] print:border print:border-black print:text-black">
                    {r.hasAdjustment ? "Sim" : "Não"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-16 hidden grid-cols-2 gap-12 px-6 print:grid">
        <div className="border-t border-black pt-2 text-center text-xs text-black">
          Assinatura do colaborador
        </div>
        <div className="border-t border-black pt-2 text-center text-xs text-black">
          Assinatura do responsável
        </div>
      </div>
    </div>
  );
}
