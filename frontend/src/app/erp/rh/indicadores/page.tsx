"use client";

import { useCallback, useEffect, useState } from "react";

import { AppShell } from "@/components";
import { ListPageLayout } from "@/components/layout/ListPageLayout";

import {
  employeeReportsService,
  EMPLOYEE_STATUS_LABELS,
  GENDER_LABELS,
  type EmployeeIndicators,
} from "@/services/hr.service";

function money(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function pct(value: number, total: number) {
  if (!total) {
    return "0%";
  }

  return `${((value / total) * 100).toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
  })}%`;
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

function Card({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] p-5">
      <p className="text-sm text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">
        {value}
      </p>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
      <div className="border-b border-[var(--border)] bg-[var(--surface-hover)] px-4 py-3">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">
          {title}
        </h2>
      </div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export default function IndicadoresRhPage() {
  const [data, setData] = useState<EmployeeIndicators | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await employeeReportsService.getIndicators();

      setData(result);
    } catch (err) {
      setError(
        extractMessage(
          err,
          "Não foi possível carregar os indicadores."
        )
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AppShell workspaceLabel="Recursos Humanos">
      <ListPageLayout
        header={
          <>
            <header>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                Indicadores
              </h1>

              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Visão geral dos colaboradores ativos: função,
                setor, salário, status e sexo.
              </p>
            </header>

            {error && (
              <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                {error}
              </div>
            )}
          </>
        }
      >
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-xl bg-[var(--surface-hover)]"
              />
            ))}
          </div>
        ) : !data ? null : (
          <div className="space-y-6 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Card
                label="Colaboradores ativos"
                value={String(data.totalActive)}
              />
              <Card
                label="Média salarial geral"
                value={money(data.averageSalary)}
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Panel title="Por função">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[var(--surface-hover)] text-[var(--text-secondary)]">
                    <tr>
                      <th className="px-4 py-2 font-semibold">
                        Função
                      </th>
                      <th className="px-4 py-2 text-right font-semibold">
                        Qtde
                      </th>
                      <th className="px-4 py-2 text-right font-semibold">
                        Média salarial
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byFunction.map((f) => (
                      <tr
                        key={f.jobFunctionId ?? "none"}
                        className="border-t border-[var(--border)]"
                      >
                        <td className="px-4 py-2 text-[var(--text-primary)]">
                          {f.jobFunctionName}
                        </td>
                        <td className="px-4 py-2 text-right text-[var(--text-secondary)]">
                          {f.count}
                        </td>
                        <td className="px-4 py-2 text-right text-[var(--text-secondary)]">
                          {money(f.averageSalary)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Panel>

              <Panel title="Por setor">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[var(--surface-hover)] text-[var(--text-secondary)]">
                    <tr>
                      <th className="px-4 py-2 font-semibold">
                        Setor
                      </th>
                      <th className="px-4 py-2 text-right font-semibold">
                        Qtde
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.bySector.map((s) => (
                      <tr
                        key={s.sectorId ?? "none"}
                        className="border-t border-[var(--border)]"
                      >
                        <td className="px-4 py-2 text-[var(--text-primary)]">
                          {s.sectorName}
                        </td>
                        <td className="px-4 py-2 text-right text-[var(--text-secondary)]">
                          {s.count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Panel>

              <Panel title="Por status">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[var(--surface-hover)] text-[var(--text-secondary)]">
                    <tr>
                      <th className="px-4 py-2 font-semibold">
                        Status
                      </th>
                      <th className="px-4 py-2 text-right font-semibold">
                        Qtde
                      </th>
                      <th className="px-4 py-2 text-right font-semibold">
                        %
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byStatus.map((s) => (
                      <tr
                        key={s.status}
                        className="border-t border-[var(--border)]"
                      >
                        <td className="px-4 py-2 text-[var(--text-primary)]">
                          {EMPLOYEE_STATUS_LABELS[s.status]}
                        </td>
                        <td className="px-4 py-2 text-right text-[var(--text-secondary)]">
                          {s.count}
                        </td>
                        <td className="px-4 py-2 text-right text-[var(--text-secondary)]">
                          {pct(s.count, data.totalActive)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Panel>

              <Panel title="Por sexo">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[var(--surface-hover)] text-[var(--text-secondary)]">
                    <tr>
                      <th className="px-4 py-2 font-semibold">
                        Sexo
                      </th>
                      <th className="px-4 py-2 text-right font-semibold">
                        Qtde
                      </th>
                      <th className="px-4 py-2 text-right font-semibold">
                        %
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byGender.map((g) => (
                      <tr
                        key={g.gender ?? "none"}
                        className="border-t border-[var(--border)]"
                      >
                        <td className="px-4 py-2 text-[var(--text-primary)]">
                          {g.gender
                            ? GENDER_LABELS[g.gender]
                            : "Não informado"}
                        </td>
                        <td className="px-4 py-2 text-right text-[var(--text-secondary)]">
                          {g.count}
                        </td>
                        <td className="px-4 py-2 text-right text-[var(--text-secondary)]">
                          {pct(g.count, data.totalActive)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Panel>
            </div>
          </div>
        )}
      </ListPageLayout>
    </AppShell>
  );
}
