"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AppShell } from "@/components";
import { ListPageLayout } from "@/components/layout/ListPageLayout";
import { SearchSelect } from "@/components/ui/SearchSelect";

import { employeeService, type Employee } from "@/services/hr.service";
import {
  vacationService,
  type VacationBalance,
} from "@/services/vacation.service";

function date(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function extractMessage(err: unknown, fallback: string) {
  const message = (
    err as { response?: { data?: { message?: unknown } } }
  )?.response?.data?.message;

  if (Array.isArray(message)) {
    return message.join(" ");
  }

  return typeof message === "string" ? message : fallback;
}

const fieldClass = `
  h-11 w-full rounded-xl border border-[var(--border)]
  bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)]
  outline-none transition-colors focus:border-[var(--primary)]
`;

const labelClass =
  "mb-1 block text-sm font-medium text-[var(--text-secondary)]";

function emptyForm() {
  return {
    employeeId: "",
    employeeLabel: "",
    startDate: "",
    days: 30,
    soldDays: 0,
  };
}

export default function ProgramacaoFeriasPage() {
  const [form, setForm] = useState(emptyForm());
  const [balance, setBalance] = useState<VacationBalance | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState(false);

  const searchEmployees = useCallback(async (query: string) => {
    return employeeService.list({ search: query || undefined, limit: 20 });
  }, []);

  async function selectEmployee(employee: Employee | null) {
    setForm((prev) => ({
      ...prev,
      employeeId: employee?.id ?? "",
      employeeLabel: employee?.name ?? "",
    }));
    setBalance(null);
    setSuccess(false);

    if (!employee) {
      return;
    }

    setBalanceLoading(true);

    try {
      const result = await vacationService.getBalance(employee.id);

      setBalance(result);
      setForm((prev) => ({
        ...prev,
        days: Math.min(prev.days, result.availableDays),
      }));
    } catch (err) {
      setFormError(extractMessage(err, "Não foi possível calcular o saldo."));
    } finally {
      setBalanceLoading(false);
    }
  }

  async function save() {
    if (!form.employeeId || !form.startDate || form.days < 1) {
      setFormError("Selecione o colaborador, a data de início e os dias.");

      return;
    }

    setSaving(true);
    setFormError("");
    setSuccess(false);

    try {
      await vacationService.create({
        employeeId: form.employeeId,
        startDate: form.startDate,
        days: form.days,
        soldDays: form.soldDays || undefined,
      });

      setForm(emptyForm());
      setBalance(null);
      setSuccess(true);
    } catch (err) {
      setFormError(
        extractMessage(err, "Não foi possível programar as férias.")
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell workspaceLabel="Programação de Férias">
      <ListPageLayout
        header={
          <header>
            <Link
              href="/erp/rh/ferias"
              className="mb-3 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            >
              <ArrowLeft size={16} />
              Voltar para Férias
            </Link>

            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              Programação de Férias
            </h1>

            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Programe a data e os dias de férias de um colaborador. A
              programação cai na tela de Férias aguardando aprovação — nada
              é enviado ao Financeiro até aprovar.
            </p>
          </header>
        }
      >
        <div className="mx-auto max-w-4xl space-y-4 p-4">
          {success && (
            <div className="rounded-xl border border-[var(--success)] bg-[var(--success-soft)] p-3 text-sm text-[var(--success)]">
              Programação criada — o colaborador já aparece na tela de
              Férias aguardando aprovação.{" "}
              <Link href="/erp/rh/ferias" className="font-semibold underline">
                Ver tela de Férias
              </Link>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2 lg:col-span-1">
              <label className={labelClass}>Colaborador</label>

              <SearchSelect<Employee>
                displayLabel={form.employeeLabel}
                search={searchEmployees}
                getId={(e) => e.id}
                getLabel={(e) => e.name}
                getSubLabel={(e) => e.jobFunction?.name ?? ""}
                placeholder="Digite para buscar o colaborador..."
                onSelect={(e) => void selectEmployee(e)}
              />
            </div>

            <div>
              <label className={labelClass}>Início do gozo</label>

              <input
                type="date"
                className={fieldClass}
                value={form.startDate}
                onChange={(e) =>
                  setForm({ ...form, startDate: e.target.value })
                }
              />
            </div>

            <div>
              <label className={labelClass}>Dias de descanso</label>

              <input
                type="number"
                className={fieldClass}
                value={form.days}
                onChange={(e) =>
                  setForm({ ...form, days: Number(e.target.value) })
                }
              />
            </div>

            <div>
              <label className={labelClass}>
                Dias vendidos (abono, até 10)
              </label>

              <input
                type="number"
                className={fieldClass}
                value={form.soldDays}
                onChange={(e) =>
                  setForm({ ...form, soldDays: Number(e.target.value) })
                }
              />
            </div>
          </div>

          {balanceLoading && (
            <p className="text-sm text-[var(--text-muted)]">
              Calculando saldo...
            </p>
          )}

          {balance && !balanceLoading && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] p-3 text-sm">
              <p className="text-[var(--text-primary)]">
                Período aquisitivo {date(balance.period.startDate)} —{" "}
                {date(balance.period.endDate)}: saldo de{" "}
                <span className="font-semibold">
                  {balance.availableDays} dia(s)
                </span>{" "}
                disponíveis.
              </p>

              {balance.overdue && (
                <p className="mt-1 text-[var(--danger)]">
                  Atenção: prazo concessivo (
                  {date(balance.period.concessiveDeadline)}) já venceu.
                </p>
              )}
            </div>
          )}

          {formError && (
            <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
              {formError}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="rounded-xl bg-[var(--primary)] px-6 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] disabled:opacity-60"
            >
              {saving ? "Programando..." : "Programar férias"}
            </button>
          </div>
        </div>
      </ListPageLayout>
    </AppShell>
  );
}
