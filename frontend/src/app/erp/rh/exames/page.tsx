"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FileText, Trash2, X } from "lucide-react";

import { AppShell } from "@/components";
import { Can } from "@/components/auth/Can";
import { ListPageLayout } from "@/components/layout/ListPageLayout";
import { ExportButton } from "@/components/ui/ExportButton";

import {
  EXAM_STATUS_LABELS,
  employeeExamService,
  employeeService,
  sectorService,
  type AuxiliaryRecord,
  type Employee,
  type EmployeeExam,
} from "@/services/hr.service";

type ExamSituation =
  | "SEM_EXAME"
  | "ATRASADO"
  | "A_VENCER"
  | "NO_PRAZO";

const SITUATION_LABELS: Record<ExamSituation, string> = {
  SEM_EXAME: "Sem exame registrado",
  ATRASADO: "Atrasado",
  A_VENCER: "A vencer (30 dias)",
  NO_PRAZO: "No prazo",
};

const SITUATION_BADGE_CLASS: Record<ExamSituation, string> = {
  SEM_EXAME: "bg-[var(--surface-hover)] text-[var(--text-secondary)]",
  ATRASADO: "bg-[var(--danger-soft)] text-[var(--danger)]",
  A_VENCER: "bg-[var(--warning-soft)] text-[var(--warning)]",
  NO_PRAZO: "bg-[var(--success-soft)] text-[var(--success)]",
};

function situation(
  nextExamDate: string | null | undefined
): ExamSituation {
  if (!nextExamDate) {
    return "SEM_EXAME";
  }

  const hoje = new Date();
  const em30Dias = new Date(
    hoje.getTime() + 30 * 24 * 60 * 60 * 1000
  );
  const data = new Date(nextExamDate);

  if (data < hoje) {
    return "ATRASADO";
  }

  if (data <= em30Dias) {
    return "A_VENCER";
  }

  return "NO_PRAZO";
}

function date(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
  });
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
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

export default function ExamesMedicosPage() {
  const exportTableRef = useRef<HTMLTableElement>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [sectors, setSectors] = useState<AuxiliaryRecord[]>([]);

  const [search, setSearch] = useState("");
  const [sectorId, setSectorId] = useState("");
  const [situationFilter, setSituationFilter] = useState<
    ExamSituation | ""
  >("");

  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [selectedEmployee, setSelectedEmployee] =
    useState<Employee | null>(null);
  const [examHistory, setExamHistory] = useState<
    EmployeeExam[]
  >([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [newExamDate, setNewExamDate] = useState(
    todayInputValue()
  );
  const [examSaving, setExamSaving] = useState(false);
  const [examError, setExamError] = useState("");

  useEffect(() => {
    sectorService
      .list()
      .then((r) => setSectors(r.data ?? []))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setListError("");

    try {
      const result = await employeeService.list({
        search: search || undefined,
        limit: 100,
      });

      setEmployees(result);
    } catch (err) {
      setListError(
        extractMessage(
          err,
          "Não foi possível carregar os colaboradores."
        )
      );
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 300);

    return () => clearTimeout(timer);
  }, [load]);

  const filtered = employees.filter((e) => {
    if (sectorId && e.jobFunction?.sector?.id !== sectorId) {
      return false;
    }

    if (
      situationFilter &&
      situation(e.nextExamDate) !== situationFilter
    ) {
      return false;
    }

    return true;
  });

  async function loadHistory(employeeId: string) {
    setHistoryLoading(true);

    try {
      const result = await employeeExamService.list(
        employeeId
      );

      setExamHistory(result);
    } catch (err) {
      setExamError(
        extractMessage(
          err,
          "Não foi possível carregar o histórico de exames."
        )
      );
    } finally {
      setHistoryLoading(false);
    }
  }

  function openExamModal(employee: Employee) {
    setSelectedEmployee(employee);
    setNewExamDate(todayInputValue());
    setExamError("");
    setExamHistory([]);

    void loadHistory(employee.id);
  }

  async function registerExam() {
    if (!selectedEmployee || !newExamDate) {
      return;
    }

    setExamSaving(true);
    setExamError("");

    try {
      await employeeExamService.create({
        employeeId: selectedEmployee.id,
        examDate: newExamDate,
      });

      setNewExamDate(todayInputValue());

      await loadHistory(selectedEmployee.id);
      await load();
    } catch (err) {
      setExamError(
        extractMessage(
          err,
          "Não foi possível registrar o exame."
        )
      );
    } finally {
      setExamSaving(false);
    }
  }

  async function removeExam(exam: EmployeeExam) {
    if (!selectedEmployee) {
      return;
    }

    if (
      !window.confirm(
        `Remover o registro do exame de ${date(exam.examDate)}?`
      )
    ) {
      return;
    }

    setExamError("");

    try {
      await employeeExamService.remove(exam.id);

      await loadHistory(selectedEmployee.id);
      await load();
    } catch (err) {
      setExamError(
        extractMessage(
          err,
          "Não foi possível remover o exame."
        )
      );
    }
  }

  return (
    <AppShell workspaceLabel="Exames médicos">
      <ListPageLayout
        header={
          <>
            <header>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                    Exames médicos
                  </h1>

                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    Situação de cada colaborador e registro de
                    exames ocupacionais realizados.
                  </p>
                </div>

                <div className="flex gap-2">
                <ExportButton
                  tableRef={exportTableRef}
                  filename="exames-medicos"
                  sheetName="Exames médicos"
                />

                <Link
                  href="/erp/rh/exames/relatorio"
                  className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                >
                  <FileText size={18} />
                  Relatório
                </Link>
                </div>
              </div>
            </header>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <input
                className={fieldClass}
                placeholder="Buscar colaborador..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              <select
                className={fieldClass}
                value={sectorId}
                onChange={(e) => setSectorId(e.target.value)}
              >
                <option value="">Todos os setores</option>

                {sectors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              <select
                className={fieldClass}
                value={situationFilter}
                onChange={(e) =>
                  setSituationFilter(
                    e.target.value as ExamSituation | ""
                  )
                }
              >
                <option value="">Todas as situações</option>

                {Object.entries(SITUATION_LABELS).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  )
                )}
              </select>
            </div>

            {listError && (
              <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                {listError}
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
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-medium text-[var(--text-primary)]">
              Nenhum colaborador encontrado
            </p>

            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Ajuste os filtros ou a busca.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table ref={exportTableRef} className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-[var(--surface-hover)] text-[var(--text-secondary)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">
                    Colaborador
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Função
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Setor
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Próximo exame
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Situação
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>

              <tbody>
                {filtered.map((e) => {
                  const st = situation(e.nextExamDate);

                  return (
                    <tr
                      key={e.id}
                      className="border-t border-[var(--border)]"
                    >
                      <td className="px-4 py-3 font-medium text-[var(--text-primary)]">
                        {e.name}
                      </td>

                      <td className="px-4 py-3 text-[var(--text-secondary)]">
                        {e.jobFunction?.name ?? "—"}
                      </td>

                      <td className="px-4 py-3 text-[var(--text-secondary)]">
                        {e.jobFunction?.sector?.name ?? "—"}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-[var(--text-secondary)]">
                        {date(e.nextExamDate)}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${SITUATION_BADGE_CLASS[st]}`}
                        >
                          {SITUATION_LABELS[st]}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <Can permission="employee.update">
                          <button
                            type="button"
                            onClick={() => openExamModal(e)}
                            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--primary)] transition-colors hover:border-[var(--primary)] hover:bg-[var(--primary-soft)]"
                          >
                            Registrar exame
                          </button>
                        </Can>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </ListPageLayout>

      {selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-8 w-full max-w-2xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                  Exames — {selectedEmployee.name}
                </h2>

                <p className="text-sm text-[var(--text-muted)]">
                  {selectedEmployee.jobFunction?.name ?? "—"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedEmployee(null)}
                aria-label="Fechar"
                className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className={labelClass}>
                  Data do exame
                </label>

                <input
                  type="date"
                  className={fieldClass}
                  value={newExamDate}
                  onChange={(e) =>
                    setNewExamDate(e.target.value)
                  }
                />
              </div>

              <button
                type="button"
                disabled={examSaving || !newExamDate}
                onClick={() => void registerExam()}
                className="h-11 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--primary-contrast)] disabled:opacity-60"
              >
                {examSaving ? "Registrando..." : "Registrar"}
              </button>
            </div>

            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Ao registrar, o próximo exame é calculado
              automaticamente para 1 ano depois, em dia útil.
            </p>

            {examError && (
              <div className="mt-2 rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                {examError}
              </div>
            )}

            <div className="mt-4">
              {historyLoading ? (
                <div className="h-24 animate-pulse rounded-xl bg-[var(--surface-hover)]" />
              ) : examHistory.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">
                  Nenhum exame registrado ainda.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[var(--surface-hover)] text-[var(--text-secondary)]">
                      <tr>
                        <th className="px-4 py-2 font-semibold">
                          Data do exame
                        </th>
                        <th className="px-4 py-2 font-semibold">
                          Próximo exame
                        </th>
                        <th className="px-4 py-2 font-semibold">
                          Status
                        </th>
                        <th className="px-4 py-2" />
                      </tr>
                    </thead>

                    <tbody>
                      {examHistory.map((exam) => (
                        <tr
                          key={exam.id}
                          className="border-t border-[var(--border)]"
                        >
                          <td className="px-4 py-2 text-[var(--text-primary)]">
                            {date(exam.examDate)}
                          </td>

                          <td className="px-4 py-2 text-[var(--text-secondary)]">
                            {date(exam.nextExamDate)}
                          </td>

                          <td
                            className={`px-4 py-2 font-medium ${
                              exam.status === "ATRASADO"
                                ? "text-[var(--danger)]"
                                : "text-[var(--success)]"
                            }`}
                          >
                            {EXAM_STATUS_LABELS[exam.status]}
                          </td>

                          <td className="px-4 py-2 text-right">
                            <Can permission="employee.update">
                              <button
                                type="button"
                                onClick={() =>
                                  void removeExam(exam)
                                }
                                title="Remover"
                                aria-label="Remover"
                                className="rounded-lg border border-[var(--border)] p-1.5 text-[var(--danger)] transition-colors hover:border-[var(--danger)] hover:bg-[var(--danger-soft)]"
                              >
                                <Trash2 size={14} />
                              </button>
                            </Can>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedEmployee(null)}
                className="rounded-xl border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--text-secondary)]"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
