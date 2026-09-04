"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Clock,
  Pencil,
  Plus,
  Settings,
  Trash2,
  X,
} from "lucide-react";

import { OsShell } from "@/components";
import { Can } from "@/components/auth/Can";

import {
  WEEKDAY_LABELS,
  WEEKDAY_ORDER,
  workScheduleService,
  workScheduleShiftService,
  type AuxiliaryRecord,
  type Weekday,
  type WorkScheduleShift,
} from "@/services/hr.service";

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
  h-10 w-full rounded-lg border border-[var(--border)]
  bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)]
  outline-none transition-colors focus:border-[var(--primary)]
`;

const labelClass =
  "mb-1 block text-xs font-medium text-[var(--text-secondary)]";

function emptyScheduleDraft() {
  return { name: "", description: "" };
}

function emptyShiftDraft() {
  return {
    dayFrom: "SEGUNDA" as Weekday,
    dayTo: "SEXTA" as Weekday,
    startTime: "",
    breakStart: "",
    breakEnd: "",
    endTime: "",
    lunchBreakMinutes: "",
  };
}

function shiftLabel(shift: WorkScheduleShift) {
  const days =
    shift.dayFrom === shift.dayTo
      ? WEEKDAY_LABELS[shift.dayFrom]
      : `${WEEKDAY_LABELS[shift.dayFrom]} a ${WEEKDAY_LABELS[shift.dayTo]}`;

  return days;
}

export default function HorariosDeTrabalhoPage() {
  const [schedules, setSchedules] = useState<AuxiliaryRecord[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editingId, setEditingId] = useState<string | null>(
    null
  );
  const [draft, setDraft] = useState(emptyScheduleDraft());
  const [saving, setSaving] = useState(false);

  const [shiftsFor, setShiftsFor] = useState<
    AuxiliaryRecord | null
  >(null);
  const [shifts, setShifts] = useState<WorkScheduleShift[]>([]);
  const [shiftsLoading, setShiftsLoading] = useState(false);
  const [shiftsError, setShiftsError] = useState("");

  const [shiftEditingId, setShiftEditingId] = useState<
    string | null
  >(null);
  const [shiftDraft, setShiftDraft] = useState(
    emptyShiftDraft()
  );
  const [shiftSaving, setShiftSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const result = await workScheduleService.list();

      setSchedules(result.data ?? []);
      setError("");
    } catch (err) {
      setError(
        extractMessage(
          err,
          "Não foi possível carregar os horários."
        )
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function startCreate() {
    setEditingId("new");
    setDraft(emptyScheduleDraft());
    setError("");
  }

  function startEdit(item: AuxiliaryRecord) {
    setEditingId(item.id);
    setDraft({
      name: String(item.name ?? ""),
      description: String(item.description ?? ""),
    });
    setError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(emptyScheduleDraft());
  }

  async function saveSchedule() {
    if (!draft.name.trim()) {
      setError("Nome é obrigatório.");

      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        name: draft.name.trim(),
        description: draft.description.trim() || undefined,
      };

      if (editingId === "new") {
        await workScheduleService.create(payload);
      } else if (editingId) {
        await workScheduleService.update(editingId, payload);
      }

      cancelEdit();

      await load();
    } catch (err) {
      setError(
        extractMessage(
          err,
          "Não foi possível salvar o horário."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeSchedule(item: AuxiliaryRecord) {
    if (
      !window.confirm(
        `Excluir o horário "${String(item.name)}"?`
      )
    ) {
      return;
    }

    try {
      await workScheduleService.remove(item.id);

      await load();
    } catch (err) {
      setError(
        extractMessage(
          err,
          "Não foi possível excluir o horário."
        )
      );
    }
  }

  async function openShifts(item: AuxiliaryRecord) {
    setShiftsFor(item);
    setShiftsError("");
    setShiftEditingId(null);
    setShiftsLoading(true);

    try {
      const result = await workScheduleShiftService.list(
        item.id
      );

      setShifts(result);
    } catch (err) {
      setShiftsError(
        extractMessage(
          err,
          "Não foi possível carregar as faixas de horário."
        )
      );
    } finally {
      setShiftsLoading(false);
    }
  }

  function startShiftCreate() {
    setShiftEditingId("new");
    setShiftDraft(emptyShiftDraft());
    setShiftsError("");
  }

  function startShiftEdit(shift: WorkScheduleShift) {
    setShiftEditingId(shift.id);
    setShiftDraft({
      dayFrom: shift.dayFrom,
      dayTo: shift.dayTo,
      startTime: shift.startTime,
      breakStart: shift.breakStart ?? "",
      breakEnd: shift.breakEnd ?? "",
      endTime: shift.endTime,
      lunchBreakMinutes:
        shift.lunchBreakMinutes != null
          ? String(shift.lunchBreakMinutes)
          : "",
    });
    setShiftsError("");
  }

  function cancelShiftEdit() {
    setShiftEditingId(null);
    setShiftDraft(emptyShiftDraft());
  }

  async function saveShift() {
    if (!shiftsFor) {
      return;
    }

    if (!shiftDraft.startTime || !shiftDraft.endTime) {
      setShiftsError("Informe pelo menos início e saída.");

      return;
    }

    setShiftSaving(true);
    setShiftsError("");

    try {
      const payload = {
        dayFrom: shiftDraft.dayFrom,
        dayTo: shiftDraft.dayTo,
        startTime: shiftDraft.startTime,
        breakStart: shiftDraft.breakStart || undefined,
        breakEnd: shiftDraft.breakEnd || undefined,
        endTime: shiftDraft.endTime,
        lunchBreakMinutes: shiftDraft.lunchBreakMinutes
          ? Number(shiftDraft.lunchBreakMinutes)
          : undefined,
      };

      if (shiftEditingId === "new") {
        await workScheduleShiftService.create(
          shiftsFor.id,
          payload
        );
      } else if (shiftEditingId) {
        await workScheduleShiftService.update(
          shiftsFor.id,
          shiftEditingId,
          payload
        );
      }

      cancelShiftEdit();

      const result = await workScheduleShiftService.list(
        shiftsFor.id
      );

      setShifts(result);
    } catch (err) {
      setShiftsError(
        extractMessage(
          err,
          "Não foi possível salvar a faixa de horário."
        )
      );
    } finally {
      setShiftSaving(false);
    }
  }

  async function removeShift(shift: WorkScheduleShift) {
    if (!shiftsFor) {
      return;
    }

    if (
      !window.confirm(
        `Excluir a faixa "${shiftLabel(shift)}"?`
      )
    ) {
      return;
    }

    try {
      await workScheduleShiftService.remove(
        shiftsFor.id,
        shift.id
      );

      const result = await workScheduleShiftService.list(
        shiftsFor.id
      );

      setShifts(result);
    } catch (err) {
      setShiftsError(
        extractMessage(
          err,
          "Não foi possível excluir a faixa de horário."
        )
      );
    }
  }

  return (
    <OsShell workspaceLabel="Horários de trabalho">
      <div className="space-y-6">
        <header>
          <Link
            href="/erp/rh/cadastros"
            className="mb-3 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          >
            <ArrowLeft size={16} />
            Voltar
          </Link>

          <h1 className="flex items-center gap-2 text-2xl font-bold text-[var(--text-primary)]">
            <Clock size={22} />
            Horários de trabalho
          </h1>

          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Cada horário pode ter mais de uma faixa de dias (ex.:
            SEG a SEX um horário, SÁBADO outro) — usadas pro
            cálculo de horas normais/extras no Controle de Ponto.
          </p>
        </header>

        <section className="rounded-2xl border border-[var(--border)] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-[var(--text-primary)]">
              Horários
            </h2>

            <Can permission="work-schedule.create">
              <button
                type="button"
                onClick={startCreate}
                disabled={editingId !== null}
                className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] disabled:opacity-40"
              >
                <Plus size={16} />
                Novo
              </button>
            </Can>
          </div>

          {error && (
            <div className="mb-3 rounded-lg border border-[var(--danger)] bg-[var(--danger-soft)] p-2.5 text-sm text-[var(--danger)]">
              {error}
            </div>
          )}

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-10 animate-pulse rounded-lg bg-[var(--surface-hover)]"
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {editingId === "new" && (
                <div className="flex items-center gap-2 rounded-lg border border-[var(--primary)] p-2">
                  <input
                    autoFocus
                    placeholder="Nome (ex.: Comercial)"
                    className={fieldClass}
                    value={draft.name}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        name: e.target.value,
                      })
                    }
                  />

                  <input
                    placeholder="Descrição (opcional)"
                    className={fieldClass}
                    value={draft.description}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        description: e.target.value,
                      })
                    }
                  />

                  <button
                    type="button"
                    onClick={() => void saveSchedule()}
                    disabled={saving}
                    aria-label="Salvar"
                    className="shrink-0 rounded-lg bg-[var(--primary)] p-2 text-[var(--primary-contrast)] disabled:opacity-50"
                  >
                    <Check size={16} />
                  </button>

                  <button
                    type="button"
                    onClick={cancelEdit}
                    aria-label="Cancelar"
                    className="shrink-0 rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)]"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              {schedules.length === 0 && editingId !== "new" ? (
                <p className="py-6 text-center text-sm text-[var(--text-muted)]">
                  Nenhum horário cadastrado.
                </p>
              ) : (
                schedules.map((item) =>
                  editingId === item.id ? (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 rounded-lg border border-[var(--primary)] p-2"
                    >
                      <input
                        placeholder="Nome"
                        className={fieldClass}
                        value={draft.name}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            name: e.target.value,
                          })
                        }
                      />

                      <input
                        placeholder="Descrição"
                        className={fieldClass}
                        value={draft.description}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            description: e.target.value,
                          })
                        }
                      />

                      <button
                        type="button"
                        onClick={() => void saveSchedule()}
                        disabled={saving}
                        aria-label="Salvar"
                        className="shrink-0 rounded-lg bg-[var(--primary)] p-2 text-[var(--primary-contrast)] disabled:opacity-50"
                      >
                        <Check size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={cancelEdit}
                        aria-label="Cancelar"
                        className="shrink-0 rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)]"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 rounded-lg border border-[var(--border)] px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                          {String(item.name ?? "")}
                        </p>

                        {item.description ? (
                          <p className="truncate text-xs text-[var(--text-muted)]">
                            {String(item.description)}
                          </p>
                        ) : null}
                      </div>

                      <Can permission="work-schedule.update">
                        <button
                          type="button"
                          onClick={() => void openShifts(item)}
                          className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-medium text-[var(--primary)] transition-colors hover:border-[var(--primary)] hover:bg-[var(--primary-soft)]"
                        >
                          <Settings size={14} />
                          Configurar horários
                        </button>
                      </Can>

                      <Can permission="work-schedule.update">
                        <button
                          type="button"
                          onClick={() => startEdit(item)}
                          aria-label="Editar"
                          className="rounded-lg border border-[var(--border)] p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)]"
                        >
                          <Pencil size={14} />
                        </button>
                      </Can>

                      <Can permission="work-schedule.delete">
                        <button
                          type="button"
                          onClick={() =>
                            void removeSchedule(item)
                          }
                          aria-label="Excluir"
                          className="rounded-lg border border-[var(--border)] p-1.5 text-[var(--danger)] transition-colors hover:border-[var(--danger)] hover:bg-[var(--danger-soft)]"
                        >
                          <Trash2 size={14} />
                        </button>
                      </Can>
                    </div>
                  )
                )
              )}
            </div>
          )}
        </section>
      </div>

      {shiftsFor && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-8 w-full max-w-4xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                  Faixas de horário — {String(shiftsFor.name)}
                </h2>

                <p className="text-sm text-[var(--text-muted)]">
                  Sem intervalo informado, deixe os campos "Início
                  do intervalo"/"Fim do intervalo" em branco e
                  preencha só "Intervalo (min)" — ou nenhum dos
                  dois, se o dia não tiver intervalo.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShiftsFor(null)}
                aria-label="Fechar"
                className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)]"
              >
                <X size={18} />
              </button>
            </div>

            {shiftsError && (
              <div className="mb-3 rounded-lg border border-[var(--danger)] bg-[var(--danger-soft)] p-2.5 text-sm text-[var(--danger)]">
                {shiftsError}
              </div>
            )}

            <div className="mb-4 flex justify-end">
              <Can permission="work-schedule.update">
                <button
                  type="button"
                  onClick={startShiftCreate}
                  disabled={shiftEditingId !== null}
                  className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] disabled:opacity-40"
                >
                  <Plus size={16} />
                  Nova faixa
                </button>
              </Can>
            </div>

            {shiftEditingId && (
              <div className="mb-4 grid gap-3 rounded-xl border border-[var(--primary)] p-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className={labelClass}>De</label>

                  <select
                    className={fieldClass}
                    value={shiftDraft.dayFrom}
                    onChange={(e) =>
                      setShiftDraft({
                        ...shiftDraft,
                        dayFrom: e.target.value as Weekday,
                      })
                    }
                  >
                    {WEEKDAY_ORDER.map((day) => (
                      <option key={day} value={day}>
                        {WEEKDAY_LABELS[day]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Até</label>

                  <select
                    className={fieldClass}
                    value={shiftDraft.dayTo}
                    onChange={(e) =>
                      setShiftDraft({
                        ...shiftDraft,
                        dayTo: e.target.value as Weekday,
                      })
                    }
                  >
                    {WEEKDAY_ORDER.map((day) => (
                      <option key={day} value={day}>
                        {WEEKDAY_LABELS[day]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>
                    Hora início
                  </label>

                  <input
                    type="time"
                    className={fieldClass}
                    value={shiftDraft.startTime}
                    onChange={(e) =>
                      setShiftDraft({
                        ...shiftDraft,
                        startTime: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Hora saída
                  </label>

                  <input
                    type="time"
                    className={fieldClass}
                    value={shiftDraft.endTime}
                    onChange={(e) =>
                      setShiftDraft({
                        ...shiftDraft,
                        endTime: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Início do intervalo
                  </label>

                  <input
                    type="time"
                    className={fieldClass}
                    value={shiftDraft.breakStart}
                    onChange={(e) =>
                      setShiftDraft({
                        ...shiftDraft,
                        breakStart: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Fim do intervalo
                  </label>

                  <input
                    type="time"
                    className={fieldClass}
                    value={shiftDraft.breakEnd}
                    onChange={(e) =>
                      setShiftDraft({
                        ...shiftDraft,
                        breakEnd: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Intervalo (min)
                  </label>

                  <input
                    inputMode="numeric"
                    placeholder="Ex.: 60"
                    className={fieldClass}
                    value={shiftDraft.lunchBreakMinutes}
                    onChange={(e) =>
                      setShiftDraft({
                        ...shiftDraft,
                        lunchBreakMinutes: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="flex items-end gap-2">
                  <button
                    type="button"
                    onClick={() => void saveShift()}
                    disabled={shiftSaving}
                    className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[var(--primary)] text-sm font-semibold text-[var(--primary-contrast)] disabled:opacity-50"
                  >
                    <Check size={16} />
                    Salvar
                  </button>

                  <button
                    type="button"
                    onClick={cancelShiftEdit}
                    aria-label="Cancelar"
                    className="flex h-10 items-center justify-center rounded-lg border border-[var(--border)] px-3 text-[var(--text-secondary)]"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            )}

            {shiftsLoading ? (
              <div className="h-20 animate-pulse rounded-xl bg-[var(--surface-hover)]" />
            ) : shifts.length === 0 ? (
              <p className="py-6 text-center text-sm text-[var(--text-muted)]">
                Nenhuma faixa cadastrada ainda.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[var(--surface-hover)] text-[var(--text-secondary)]">
                    <tr>
                      <th className="px-3 py-2 font-semibold">
                        Dias
                      </th>
                      <th className="px-3 py-2 font-semibold">
                        Início
                      </th>
                      <th className="px-3 py-2 font-semibold">
                        Int. início
                      </th>
                      <th className="px-3 py-2 font-semibold">
                        Int. fim
                      </th>
                      <th className="px-3 py-2 font-semibold">
                        Saída
                      </th>
                      <th className="px-3 py-2 font-semibold">
                        Intervalo (min)
                      </th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>

                  <tbody>
                    {shifts.map((shift) => (
                      <tr
                        key={shift.id}
                        className="border-t border-[var(--border)]"
                      >
                        <td className="px-3 py-2 font-medium text-[var(--text-primary)]">
                          {shiftLabel(shift)}
                        </td>
                        <td className="px-3 py-2 text-[var(--text-secondary)]">
                          {shift.startTime}
                        </td>
                        <td className="px-3 py-2 text-[var(--text-secondary)]">
                          {shift.breakStart || "—"}
                        </td>
                        <td className="px-3 py-2 text-[var(--text-secondary)]">
                          {shift.breakEnd || "—"}
                        </td>
                        <td className="px-3 py-2 text-[var(--text-secondary)]">
                          {shift.endTime}
                        </td>
                        <td className="px-3 py-2 text-[var(--text-secondary)]">
                          {shift.lunchBreakMinutes ?? "—"}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex justify-end gap-2">
                            <Can permission="work-schedule.update">
                              <button
                                type="button"
                                onClick={() =>
                                  startShiftEdit(shift)
                                }
                                aria-label="Editar"
                                className="rounded-lg border border-[var(--border)] p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)]"
                              >
                                <Pencil size={14} />
                              </button>
                            </Can>

                            <Can permission="work-schedule.update">
                              <button
                                type="button"
                                onClick={() =>
                                  void removeShift(shift)
                                }
                                aria-label="Excluir"
                                className="rounded-lg border border-[var(--border)] p-1.5 text-[var(--danger)] transition-colors hover:border-[var(--danger)] hover:bg-[var(--danger-soft)]"
                              >
                                <Trash2 size={14} />
                              </button>
                            </Can>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </OsShell>
  );
}
