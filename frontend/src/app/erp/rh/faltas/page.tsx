"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CalendarX,
  CheckCircle2,
  Edit,
  Eye,
  Plus,
  Trash2,
  Undo2,
  X,
  XCircle,
} from "lucide-react";

import { AppShell } from "@/components";
import { Can } from "@/components/auth/Can";
import { ListPageLayout } from "@/components/layout/ListPageLayout";
import { ExportButton } from "@/components/ui/ExportButton";
import { SearchSelect } from "@/components/ui/SearchSelect";

import {
  employeeService,
  type Employee,
} from "@/services/hr.service";

import {
  ABSENCE_STATUS_LABELS,
  ABSENCE_TYPE_LABELS,
  absenceRecordService,
  type AbsenceRecord,
  type AbsenceStatus,
  type AbsenceType,
} from "@/services/time-tracking.service";

function extractMessage(err: unknown, fallback: string) {
  const message = (
    err as { response?: { data?: { message?: unknown } } }
  )?.response?.data?.message;

  if (Array.isArray(message)) {
    return message.join(" ");
  }

  return typeof message === "string" ? message : fallback;
}

function date(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
  });
}

const fieldClass = `
  h-11 w-full rounded-xl border border-[var(--border)]
  bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)]
  outline-none transition-colors focus:border-[var(--primary)]
`;

const labelClass =
  "mb-1 block text-sm font-medium text-[var(--text-secondary)]";

const STATUS_BADGE_CLASS: Record<AbsenceStatus, string> = {
  PENDENTE: "bg-[var(--surface-hover)] text-[var(--text-secondary)]",
  APROVADO: "bg-[var(--success-soft)] text-[var(--success)]",
  REJEITADO: "bg-[var(--danger-soft)] text-[var(--danger)]",
};

function emptyForm() {
  return {
    employeeId: "",
    employeeLabel: "",
    date: "",
    type: "FALTA_JUSTIFICADA" as AbsenceType,
    reason: "",
  };
}

export default function FaltasEAbonosPage() {
  const exportTableRef = useRef<HTMLTableElement>(null);
  const [records, setRecords] = useState<AbsenceRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState("");

  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");

  /**
   * Registro já abonado ou cancelado não pode ser editado, mas continua
   * precisando ser aberto pra consulta.
   */
  const [viewOnly, setViewOnly] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [actionId, setActionId] = useState("");
  const [actionError, setActionError] = useState("");

  const searchEmployees = useCallback(async (query: string) => {
    return employeeService.list({
      search: query || undefined,
      limit: 20,
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setListError("");

    try {
      const result = await absenceRecordService.list({
        status: (statusFilter || undefined) as
          | AbsenceStatus
          | undefined,
      });

      setRecords(result);
    } catch (err) {
      setListError(
        extractMessage(
          err,
          "Não foi possível carregar as faltas e abonos."
        )
      );
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  function openView(record: AbsenceRecord) {
    openEdit(record);
    setViewOnly(true);
  }

  function openCreate() {
    setViewOnly(false);
    setEditingId(null);
    setForm(emptyForm());
    setFormError("");
    setFormOpen(true);
  }

  function openEdit(record: AbsenceRecord) {
    setViewOnly(false);
    setEditingId(record.id);
    setForm({
      employeeId: record.employeeId,
      employeeLabel: record.employee?.name ?? "",
      date: record.date.slice(0, 10),
      type: record.type,
      reason: record.reason ?? "",
    });
    setFormError("");
    setFormOpen(true);
  }

  async function saveForm() {
    if (!form.employeeId || !form.date) {
      setFormError("Selecione o colaborador e a data.");

      return;
    }

    setSaving(true);
    setFormError("");

    const payload = {
      employeeId: form.employeeId,
      date: form.date,
      type: form.type,
      reason: form.reason || undefined,
    };

    try {
      if (editingId) {
        await absenceRecordService.update(editingId, payload);
      } else {
        await absenceRecordService.create(payload);
      }

      setFormOpen(false);

      await load();
    } catch (err) {
      setFormError(
        extractMessage(err, "Não foi possível salvar.")
      );
    } finally {
      setSaving(false);
    }
  }

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
    <AppShell workspaceLabel="Faltas e abonos">
      <ListPageLayout
        header={
          <>
            <header>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="flex items-center gap-2 text-2xl font-bold text-[var(--text-primary)]">
                    <CalendarX size={22} />
                    Faltas e abonos
                  </h1>

                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    Justificativas de falta e abonos, com aprovação.
                  </p>
                </div>

                <div className="flex gap-2">
                  <ExportButton
                    tableRef={exportTableRef}
                    filename="faltas-e-abonos"
                    sheetName="Faltas e abonos"
                  />

                  <Can permission="absence-record.create">
                    <button
                      type="button"
                      onClick={openCreate}
                      className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)]"
                    >
                      <Plus size={18} />
                      Novo registro
                    </button>
                  </Can>
                </div>
              </div>
            </header>

            <div className="flex flex-wrap gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={`${fieldClass} max-w-64`}
              >
                <option value="">Todos os status</option>

                {Object.entries(ABSENCE_STATUS_LABELS).map(
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
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-xl bg-[var(--surface-hover)]"
              />
            ))}
          </div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-medium text-[var(--text-primary)]">
              Nenhum registro
            </p>

            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Use &quot;Novo registro&quot; para começar.
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
                    Data
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Tipo
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Motivo
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Status
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>

              <tbody>
                {records.map((r) => {
                  const busy = actionId === r.id;

                  return (
                    <tr
                      key={r.id}
                      className="border-t border-[var(--border)]"
                    >
                      <td className="px-4 py-3 font-medium text-[var(--text-primary)]">
                        {r.employee?.name ?? "—"}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-[var(--text-secondary)]">
                        {date(r.date)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-[var(--text-secondary)]">
                        {ABSENCE_TYPE_LABELS[r.type]}
                      </td>

                      <td className="px-4 py-3 text-[var(--text-secondary)]">
                        {r.reason || "—"}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE_CLASS[r.status]}`}
                        >
                          {ABSENCE_STATUS_LABELS[r.status]}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {/* Sempre disponível: consultar não altera nada. */}
                          <button
                            type="button"
                            onClick={() => openView(r)}
                            title="Consultar"
                            aria-label="Consultar"
                            className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)]"
                          >
                            <Eye size={16} />
                          </button>

                          {r.status === "PENDENTE" && (
                            <>
                              <Can permission="absence-record.update">
                                <button
                                  type="button"
                                  onClick={() => openEdit(r)}
                                  title="Editar"
                                  aria-label="Editar"
                                  className="rounded-lg border border-[var(--border)] p-2 text-[var(--primary)] transition-colors hover:border-[var(--primary)] hover:bg-[var(--primary-soft)]"
                                >
                                  <Edit size={16} />
                                </button>
                              </Can>

                              <Can permission="absence-record.approve">
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() =>
                                    void runAction(
                                      r.id,
                                      (id) =>
                                        absenceRecordService.approve(
                                          id
                                        ),
                                      "Não foi possível aprovar."
                                    )
                                  }
                                  title="Aprovar"
                                  aria-label="Aprovar"
                                  className="rounded-lg border border-[var(--border)] p-2 text-[var(--success)] transition-colors hover:border-[var(--success)] hover:bg-[var(--success-soft)] disabled:opacity-50"
                                >
                                  <CheckCircle2 size={16} />
                                </button>
                              </Can>

                              <Can permission="absence-record.approve">
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() =>
                                    void runAction(
                                      r.id,
                                      (id) =>
                                        absenceRecordService.reject(
                                          id
                                        ),
                                      "Não foi possível rejeitar."
                                    )
                                  }
                                  title="Rejeitar"
                                  aria-label="Rejeitar"
                                  className="rounded-lg border border-[var(--border)] p-2 text-[var(--danger)] transition-colors hover:border-[var(--danger)] hover:bg-[var(--danger-soft)] disabled:opacity-50"
                                >
                                  <XCircle size={16} />
                                </button>
                              </Can>

                              <Can permission="absence-record.update">
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() =>
                                    void runAction(
                                      r.id,
                                      (id) =>
                                        absenceRecordService.remove(
                                          id
                                        ),
                                      "Não foi possível excluir."
                                    )
                                  }
                                  title="Excluir"
                                  aria-label="Excluir"
                                  className="rounded-lg border border-[var(--border)] p-2 text-[var(--danger)] transition-colors hover:border-[var(--danger)] hover:bg-[var(--danger-soft)] disabled:opacity-50"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </Can>
                            </>
                          )}

                          {r.status !== "PENDENTE" && (
                            <Can permission="absence-record.approve">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() =>
                                  void runAction(
                                    r.id,
                                    (id) =>
                                      absenceRecordService.reopen(
                                        id
                                      ),
                                    "Não foi possível reabrir."
                                  )
                                }
                                title="Reabrir"
                                aria-label="Reabrir"
                                className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-2 py-2 text-xs font-medium text-[var(--accent-maroon)] transition-colors hover:border-[var(--accent-maroon)] hover:bg-[var(--accent-maroon-soft)] disabled:opacity-50"
                              >
                                <Undo2 size={16} />
                                Reabrir
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

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-8 w-full max-w-3xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                {viewOnly
                  ? "Registro"
                  : editingId
                    ? "Editar registro"
                    : "Novo registro"}
              </h2>

              <button
                type="button"
                onClick={() => setFormOpen(false)}
                aria-label="Fechar"
                className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)]"
              >
                <X size={18} />
              </button>
            </div>

            <fieldset
              disabled={viewOnly}
              className={`space-y-4 ${viewOnly ? "pointer-events-none" : ""}`}
            >
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className={labelClass}>
                    Colaborador
                  </label>

                  <SearchSelect<Employee>
                    displayLabel={form.employeeLabel}
                    search={searchEmployees}
                    getId={(e) => e.id}
                    getLabel={(e) => e.name}
                    placeholder="Digite para buscar o colaborador..."
                    onSelect={(e) =>
                      setForm({
                        ...form,
                        employeeId: e?.id ?? "",
                        employeeLabel: e?.name ?? "",
                      })
                    }
                  />
                </div>

                <div>
                  <label className={labelClass}>Data</label>

                  <input
                    type="date"
                    className={fieldClass}
                    value={form.date}
                    onChange={(e) =>
                      setForm({ ...form, date: e.target.value })
                    }
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-3">
                  <label className={labelClass}>Tipo</label>

                  <select
                    className={fieldClass}
                    value={form.type}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        type: e.target.value as AbsenceType,
                      })
                    }
                  >
                    {Object.entries(ABSENCE_TYPE_LABELS).map(
                      ([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div className="sm:col-span-2 lg:col-span-3">
                  <label className={labelClass}>
                    Motivo (opcional)
                  </label>

                  <input
                    className={fieldClass}
                    value={form.reason}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        reason: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              {formError && (
                <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                  {formError}
                </div>
              )}

            </fieldset>

            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="rounded-xl border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--text-secondary)]"
              >
                {viewOnly ? "Fechar" : "Cancelar"}
              </button>

              {!viewOnly && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void saveForm()}
                  className="rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] disabled:opacity-60"
                >
                  {saving ? "Salvando..." : "Salvar"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
