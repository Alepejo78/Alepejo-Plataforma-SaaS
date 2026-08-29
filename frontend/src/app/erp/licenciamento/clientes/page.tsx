"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, ShieldOff } from "lucide-react";

import { OsShell } from "@/components";
import { ListPageLayout } from "@/components/layout/ListPageLayout";
import { ExportButton } from "@/components/ui/ExportButton";
import { useAuth } from "@/providers/AuthProvider";

import {
  billingService,
  type CustomerReportRow,
  type MonthStatus,
} from "@/services/billing.service";

function money(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
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

const MONTH_LABELS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

const STATUS_LABELS: Record<MonthStatus, string> = {
  PAGO: "Pago",
  A_PAGAR: "A pagar",
  VENCIDO: "Vencido",
  EM_TESTE: "Em teste",
  VAZIO: "—",
};

const STATUS_CLASS: Record<MonthStatus, string> = {
  PAGO: "text-[var(--success)]",
  A_PAGAR: "text-[var(--text-muted)]",
  VENCIDO: "text-[var(--danger)]",
  EM_TESTE: "text-[var(--primary)]",
  VAZIO: "text-[var(--text-muted)]",
};

const CYCLE_LABELS: Record<"MONTHLY" | "YEARLY", string> = {
  MONTHLY: "Mensal",
  YEARLY: "Anual",
};

export default function ClientesFaturamentoPage() {
  const { can } = useAuth();
  const allowed = can("platform.license.manage");
  const exportTableRef = useRef<HTMLTableElement>(null);

  const [year, setYear] = useState(() => new Date().getFullYear());
  const [rows, setRows] = useState<CustomerReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!allowed) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await billingService.customerReport(year);
      setRows(result);
    } catch (err) {
      setError(
        extractMessage(err, "Não foi possível carregar o relatório.")
      );
    } finally {
      setLoading(false);
    }
  }, [allowed, year]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!allowed) {
    return (
      <OsShell workspaceLabel="Clientes e faturamento">
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-[var(--border)] p-12 text-center">
          <ShieldOff size={32} className="text-[var(--text-muted)]" />

          <p className="font-medium text-[var(--text-primary)]">
            Acesso restrito
          </p>

          <p className="max-w-sm text-sm text-[var(--text-muted)]">
            Esta área é exclusiva da administração da plataforma.
          </p>
        </div>
      </OsShell>
    );
  }

  const yearTotal = rows.reduce((sum, row) => sum + row.total, 0);

  return (
    <OsShell workspaceLabel="Clientes e faturamento">
      <ListPageLayout
        header={
          <>
            <Link
              href="/os"
              className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            >
              <ArrowLeft size={16} />
              Voltar para OS
            </Link>

            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                  Clientes e faturamento
                </h1>

                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Quem comprou o ERP, o plano e os módulos contratados,
                  e o valor pago ou a pagar mês a mês.{" "}
                  <Link
                    href="/erp/licenciamento/planos"
                    className="font-medium text-[var(--primary)] hover:underline"
                  >
                    Ver planos e preços
                  </Link>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <ExportButton
                  tableRef={exportTableRef}
                  filename="clientes-e-faturamento"
                  sheetName="Clientes"
                />

                <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5">
                  <button
                    type="button"
                    onClick={() => setYear((y) => y - 1)}
                  aria-label="Ano anterior"
                  className="rounded-lg p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)]"
                >
                  <ChevronLeft size={16} />
                </button>

                <span className="min-w-12 text-center text-sm font-semibold text-[var(--text-primary)]">
                  {year}
                </span>

                <button
                  type="button"
                  onClick={() => setYear((y) => y + 1)}
                  aria-label="Próximo ano"
                  className="rounded-lg p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)]"
                >
                  <ChevronRight size={16} />
                </button>
                </div>
              </div>
            </div>

            {!loading && !error && (
              <p className="text-sm text-[var(--text-muted)]">
                {rows.length} cliente(s) — total do ano:{" "}
                <span className="font-semibold text-[var(--text-primary)]">
                  {money(yearTotal)}
                </span>
              </p>
            )}

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
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-12 animate-pulse rounded-xl bg-[var(--surface-hover)]"
              />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-medium text-[var(--text-primary)]">
              Nenhum cliente encontrado
            </p>

            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Empresas que se cadastraram pelo site aparecem aqui.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table ref={exportTableRef} className="w-full text-left text-sm">
              <thead className="bg-[var(--surface-hover)] text-[var(--text-secondary)]">
                <tr>
                  <th className="sticky left-0 z-10 bg-[var(--surface-hover)] px-4 py-3 font-semibold">
                    Cliente
                  </th>
                  <th className="px-4 py-3 font-semibold">Contato</th>
                  <th className="px-4 py-3 font-semibold">Plano</th>
                  <th className="px-4 py-3 font-semibold">Módulos</th>
                  <th className="px-4 py-3 font-semibold">Ciclo</th>
                  {MONTH_LABELS.map((label) => (
                    <th
                      key={label}
                      className="whitespace-nowrap px-3 py-3 text-right font-semibold"
                    >
                      {label}
                    </th>
                  ))}
                  <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">
                    Total
                  </th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.companyId}
                    className="border-t border-[var(--border)]"
                  >
                    <td className="sticky left-0 z-10 whitespace-nowrap bg-[var(--surface)] px-4 py-3 font-medium text-[var(--text-primary)]">
                      {row.legalName}
                      <p className="text-xs font-normal text-[var(--text-muted)]">
                        {row.document}
                      </p>
                    </td>

                    <td className="px-4 py-3 text-[var(--text-secondary)]">
                      <p className="whitespace-nowrap">
                        {row.email || "—"}
                      </p>
                      <p className="whitespace-nowrap text-xs text-[var(--text-muted)]">
                        {row.phone || "—"}
                      </p>
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-[var(--text-secondary)]">
                      {row.planName || "—"}
                    </td>

                    <td className="min-w-48 px-4 py-3 text-xs text-[var(--text-secondary)]">
                      {row.modules.length > 0
                        ? row.modules.join(", ")
                        : "—"}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-[var(--text-secondary)]">
                      {row.billingCycle
                        ? CYCLE_LABELS[row.billingCycle]
                        : "—"}
                    </td>

                    {row.months.map((cell) => (
                      <td
                        key={cell.month}
                        className="whitespace-nowrap px-3 py-3 text-right"
                      >
                        {cell.status === "VAZIO" ? (
                          <span className="text-[var(--text-muted)]">
                            —
                          </span>
                        ) : cell.status === "EM_TESTE" ? (
                          <span
                            className={`text-xs font-medium ${STATUS_CLASS.EM_TESTE}`}
                          >
                            {STATUS_LABELS.EM_TESTE}
                          </span>
                        ) : (
                          <div>
                            <p className="text-[var(--text-primary)]">
                              {money(cell.value)}
                            </p>
                            <p
                              className={`text-[11px] ${STATUS_CLASS[cell.status]}`}
                            >
                              {STATUS_LABELS[cell.status]}
                            </p>
                          </div>
                        )}
                      </td>
                    ))}

                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-[var(--text-primary)]">
                      {money(row.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ListPageLayout>
    </OsShell>
  );
}
