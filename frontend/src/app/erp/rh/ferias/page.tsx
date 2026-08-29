"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, Eye, Plus, XCircle } from "lucide-react";

import { AppShell } from "@/components";
import { Can } from "@/components/auth/Can";
import { ListPageLayout } from "@/components/layout/ListPageLayout";
import { ExportButton } from "@/components/ui/ExportButton";

import {
  VACATION_STATUS_LABELS,
  formatVacationNumber,
  vacationService,
  type VacationGrant,
} from "@/services/vacation.service";
import type { PayrollStatus } from "@/services/payroll.service";

function num(value: string | number | null | undefined) {
  return Number(value ?? 0);
}

function money(value: string | number | null | undefined) {
  return num(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

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

const STATUS_BADGE_CLASS: Record<PayrollStatus, string> = {
  DRAFT: "bg-[var(--surface-hover)] text-[var(--text-secondary)]",
  APPROVED: "bg-[var(--success-soft)] text-[var(--success)]",
  CANCELLED: "bg-[var(--danger-soft)] text-[var(--danger)]",
};

export default function FeriasPage() {
  const exportTableRef = useRef<HTMLTableElement>(null);
  const [grants, setGrants] = useState<VacationGrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [actionId, setActionId] = useState("");
  const [actionError, setActionError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setListError("");

    try {
      const result = await vacationService.list();

      setGrants(result);
    } catch (err) {
      setListError(extractMessage(err, "Não foi possível carregar as férias."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function runAction(
    id: string,
    action: (id: string) => Promise<unknown>,
    fallback: string
  ) {
    setActionId(id);
    setActionError("");

    try {
      await action(id);
      await load();
    } catch (err) {
      setActionError(extractMessage(err, fallback));
    } finally {
      setActionId("");
    }
  }

  return (
    <AppShell workspaceLabel="Férias">
      <ListPageLayout
        header={
          <>
            <header>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                    Férias
                  </h1>

                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    Fila de aprovação — programações feitas em
                    &quot;Programação de Férias&quot; caem aqui aguardando
                    aprovação. Saldo por período aquisitivo (12 meses), com
                    abono pecuniário e 1/3 constitucional calculados
                    automaticamente.
                  </p>
                </div>

                <div className="flex gap-2">
                  <ExportButton
                    tableRef={exportTableRef}
                    filename="ferias"
                    sheetName="Férias"
                  />

                  <Can permission="vacation.create">
                    <Link
                      href="/erp/rh/ferias/programacao"
                      className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)]"
                    >
                      <Plus size={18} />
                      Programar férias
                    </Link>
                  </Can>
                </div>
              </div>
            </header>

            {listError && (
              <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                {listError}
              </div>
            )}

            {actionError && (
              <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                {actionError}
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
                className="h-14 animate-pulse rounded-xl bg-[var(--surface-hover)]"
              />
            ))}
          </div>
        ) : grants.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-medium text-[var(--text-primary)]">
              Nenhuma férias programada
            </p>

            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Use &quot;Programar férias&quot; para começar.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table ref={exportTableRef} className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-[var(--surface-hover)] text-[var(--text-secondary)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Número</th>
                  <th className="px-4 py-3 font-semibold">Colaborador</th>
                  <th className="px-4 py-3 font-semibold">Período</th>
                  <th className="px-4 py-3 text-right font-semibold">Dias</th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Líquido
                  </th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>

              <tbody>
                {grants.map((g) => {
                  const busy = actionId === g.id;

                  return (
                    <tr key={g.id} className="border-t border-[var(--border)]">
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-[var(--text-primary)]">
                        {formatVacationNumber(g.number)}
                      </td>

                      <td className="px-4 py-3 font-medium text-[var(--text-primary)]">
                        {g.employee?.name}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-[var(--text-secondary)]">
                        {date(g.startDate)} — {date(g.endDate)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-right text-[var(--text-secondary)]">
                        {g.days}
                        {g.soldDays > 0 ? ` (+${g.soldDays} vendido)` : ""}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-[var(--text-primary)]">
                        {money(g.netAmount)}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE_CLASS[g.status]}`}
                        >
                          {VACATION_STATUS_LABELS[g.status]}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/erp/rh/ferias/recibo/${g.id}`}
                            target="_blank"
                            title="Ver recibo"
                            aria-label="Ver recibo"
                            className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                          >
                            <Eye size={16} />
                          </Link>

                          {g.status === "DRAFT" && (
                            <>
                              <Can permission="vacation.approve">
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() =>
                                    void runAction(
                                      g.id,
                                      vacationService.approve,
                                      "Não foi possível aprovar."
                                    )
                                  }
                                  title="Aprovar (gera título a pagar)"
                                  aria-label="Aprovar"
                                  className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:opacity-50"
                                >
                                  <Check size={16} />
                                </button>
                              </Can>

                              <Can permission="vacation.cancel">
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() =>
                                    void runAction(
                                      g.id,
                                      vacationService.cancel,
                                      "Não foi possível cancelar."
                                    )
                                  }
                                  title="Cancelar"
                                  aria-label="Cancelar"
                                  className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--danger)] hover:text-[var(--danger)] disabled:opacity-50"
                                >
                                  <XCircle size={16} />
                                </button>
                              </Can>
                            </>
                          )}

                          {g.status === "APPROVED" && (
                            <Can permission="vacation.cancel">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() =>
                                  void runAction(
                                    g.id,
                                    vacationService.reverse,
                                    "Não foi possível estornar."
                                  )
                                }
                                title="Estornar aprovação (volta a aguardar aprovação)"
                                aria-label="Estornar"
                                className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--danger)] hover:text-[var(--danger)] disabled:opacity-50"
                              >
                                <XCircle size={16} />
                              </button>
                            </Can>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </ListPageLayout>
    </AppShell>
  );
}
