"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText,
  Pencil,
  Plus,
  Settings2,
  Trash2,
  X,
} from "lucide-react";

import { AppShell } from "@/components";
import { Can } from "@/components/auth/Can";
import { ListPageLayout } from "@/components/layout/ListPageLayout";
import { SearchSelect } from "@/components/ui/SearchSelect";
import { CurrencyInput } from "@/components/ui/CurrencyInput";

import {
  SALARY_TYPE_LABELS,
  cboService,
  jobFunctionService,
  ppeTypeService,
  sectorService,
  workScheduleService,
  type AuxiliaryRecord,
  type CboOccupation,
  type JobFunction,
  type SalaryType,
} from "@/services/hr.service";

function num(value: string | number | null | undefined) {
  return Number(value ?? 0);
}

function money(value: string | number | null | undefined) {
  return num(value).toLocaleString("pt-BR", {
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

const fieldClass = `
  h-11 w-full rounded-xl border border-[var(--border)]
  bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)]
  outline-none transition-colors focus:border-[var(--primary)]
`;

const labelClass =
  "mb-1 block text-sm font-medium text-[var(--text-secondary)]";

interface FormState {
  name: string;
  description: string;
  cboCode: string;
  cboLabel: string;
  sectorId: string;
  workScheduleId: string;
  baseSalary: number;
  salaryType: SalaryType | "";
  requiresPpe: boolean;
  ppeTypeIds: string[];
}

function emptyForm(): FormState {
  return {
    name: "",
    description: "",
    cboCode: "",
    cboLabel: "",
    sectorId: "",
    workScheduleId: "",
    baseSalary: 0,
    salaryType: "",
    requiresPpe: false,
    ppeTypeIds: [],
  };
}

export default function FuncoesPage() {
  const [items, setItems] = useState<JobFunction[]>([]);
  const [sectors, setSectors] = useState<AuxiliaryRecord[]>([]);
  const [schedules, setSchedules] = useState<AuxiliaryRecord[]>(
    []
  );
  const [ppeTypes, setPpeTypes] = useState<AuxiliaryRecord[]>(
    []
  );

  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(
    null
  );
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [actionError, setActionError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setListError("");

    try {
      const result = await jobFunctionService.list();

      setItems(result);
    } catch (err) {
      setListError(
        extractMessage(
          err,
          "Não foi possível carregar as funções."
        )
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    sectorService
      .list()
      .then((r) => setSectors(r.data))
      .catch(() => {});

    workScheduleService
      .list()
      .then((r) => setSchedules(r.data))
      .catch(() => {});

    ppeTypeService
      .list()
      .then((r) => setPpeTypes(r.data))
      .catch(() => {});
  }, []);

  const searchCbo = useCallback(async (query: string) => {
    return cboService.list(query || undefined);
  }, []);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setFormError("");
    setFormOpen(true);
  }

  function openEdit(item: JobFunction) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      description: item.description ?? "",
      cboCode: item.cboCode ?? "",
      cboLabel:
        item.cboCode && item.cboTitle
          ? `${item.cboCode} — ${item.cboTitle}`
          : "",
      sectorId: item.sectorId ?? "",
      workScheduleId: item.workScheduleId ?? "",
      baseSalary: num(item.baseSalary),
      salaryType: item.salaryType ?? "",
      requiresPpe: item.requiresPpe,
      ppeTypeIds: item.ppeTypes.map((p) => p.id),
    });
    setFormError("");
    setFormOpen(true);
  }

  function togglePpe(id: string) {
    setForm((prev) => ({
      ...prev,
      ppeTypeIds: prev.ppeTypeIds.includes(id)
        ? prev.ppeTypeIds.filter((p) => p !== id)
        : [...prev.ppeTypeIds, id],
    }));
  }

  async function save() {
    if (!form.name.trim()) {
      setFormError("Informe o nome da função.");

      return;
    }

    setSaving(true);
    setFormError("");

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      cboCode: form.cboCode || undefined,
      sectorId: form.sectorId || undefined,
      workScheduleId: form.workScheduleId || undefined,
      baseSalary: form.baseSalary || undefined,
      salaryType: form.salaryType || undefined,
      requiresPpe: form.requiresPpe,
      ppeTypeIds: form.requiresPpe ? form.ppeTypeIds : [],
    };

    try {
      if (editingId) {
        await jobFunctionService.update(editingId, payload);
      } else {
        await jobFunctionService.create(payload);
      }

      setFormOpen(false);

      await load();
    } catch (err) {
      setFormError(
        extractMessage(
          err,
          "Não foi possível salvar a função."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: JobFunction) {
    if (
      !window.confirm(`Excluir a função "${item.name}"?`)
    ) {
      return;
    }

    setActionError("");

    try {
      await jobFunctionService.remove(item.id);

      await load();
    } catch (err) {
      setActionError(
        extractMessage(
          err,
          "Não foi possível excluir a função."
        )
      );
    }
  }

  return (
    <AppShell workspaceLabel="Recursos Humanos">
      <ListPageLayout
        header={
          <>
            <header className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                  Funções e cargos
                </h1>

                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Cadastro de funções, com CBO, setor, salário,
                  horário e EPIs exigidos.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/erp/rh/funcoes/relatorio"
                  target="_blank"
                  className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                >
                  <FileText size={18} />
                  Relatório
                </Link>

                <Link
                  href="/erp/rh/cadastros"
                  className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                >
                  <Settings2 size={18} />
                  Setores, horários e EPI
                </Link>

                <Can permission="job-function.create">
                  <button
                    type="button"
                    onClick={openCreate}
                    className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)]"
                  >
                    <Plus size={18} />
                    Nova função
                  </button>
                </Can>
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
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-medium text-[var(--text-primary)]">
              Nenhuma função cadastrada
            </p>

            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Use &quot;Nova função&quot; para começar.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-[var(--surface-hover)] text-[var(--text-secondary)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">
                    Função
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    CBO
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Setor
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Salário
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Horário
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    EPI
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>

              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-t border-[var(--border)]"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-[var(--text-primary)]">
                        {item.name}
                      </p>

                      {item.description && (
                        <p className="max-w-xs truncate text-xs text-[var(--text-muted)]">
                          {item.description}
                        </p>
                      )}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-[var(--text-secondary)]">
                      {item.cboCode ? (
                        <span title={item.cboTitle ?? ""}>
                          {item.cboCode}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td className="px-4 py-3 text-[var(--text-secondary)]">
                      {item.sector?.name ?? "—"}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-right text-[var(--text-secondary)]">
                      {item.baseSalary ? (
                        <>
                          {money(item.baseSalary)}
                          {item.salaryType && (
                            <span className="block text-xs text-[var(--text-muted)]">
                              {
                                SALARY_TYPE_LABELS[
                                  item.salaryType
                                ]
                              }
                            </span>
                          )}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td className="px-4 py-3 text-[var(--text-secondary)]">
                      {item.workSchedule?.name ?? "—"}
                    </td>

                    <td className="px-4 py-3">
                      {item.requiresPpe ? (
                        <span
                          className="inline-flex rounded-full bg-[var(--warning-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--warning)]"
                          title={item.ppeTypes
                            .map((p) => p.name)
                            .join(", ")}
                        >
                          {item.ppeTypes.length} item(ns)
                        </span>
                      ) : (
                        <span className="text-[var(--text-muted)]">
                          Não exige
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Can permission="job-function.update">
                          <button
                            type="button"
                            onClick={() => openEdit(item)}
                            title="Editar"
                            aria-label="Editar"
                            className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                          >
                            <Pencil size={16} />
                          </button>
                        </Can>

                        <Can permission="job-function.delete">
                          <button
                            type="button"
                            onClick={() => void remove(item)}
                            title="Excluir"
                            aria-label="Excluir"
                            className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--danger)] hover:text-[var(--danger)]"
                          >
                            <Trash2 size={16} />
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
      </ListPageLayout>

      {/* Nova/editar função */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-8 w-full max-w-4xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                {editingId ? "Editar função" : "Nova função"}
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

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="sm:col-span-2 lg:col-span-2">
                  <label className={labelClass}>
                    Nome da função
                  </label>

                  <input
                    className={fieldClass}
                    value={form.name}
                    onChange={(e) =>
                      setForm({ ...form, name: e.target.value })
                    }
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-2">
                  <label className={labelClass}>
                    CBO (Classificação Brasileira de Ocupações)
                  </label>

                  <SearchSelect<CboOccupation>
                    displayLabel={form.cboLabel}
                    search={searchCbo}
                    getId={(o) => o.code}
                    getLabel={(o) => `${o.code} — ${o.title}`}
                    placeholder="Digite para buscar a ocupação..."
                    onSelect={(o) =>
                      setForm({
                        ...form,
                        cboCode: o?.code ?? "",
                        cboLabel: o
                          ? `${o.code} — ${o.title}`
                          : "",
                      })
                    }
                  />
                </div>

                <div>
                  <label className={labelClass}>Setor</label>

                  <select
                    className={fieldClass}
                    value={form.sectorId}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        sectorId: e.target.value,
                      })
                    }
                  >
                    <option value="">Selecione...</option>

                    {sectors.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>
                    Horário de trabalho
                  </label>

                  <select
                    className={fieldClass}
                    value={form.workScheduleId}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        workScheduleId: e.target.value,
                      })
                    }
                  >
                    <option value="">Selecione...</option>

                    {schedules.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>
                    Salário base (R$)
                  </label>

                  <CurrencyInput
                    className={fieldClass}
                    value={form.baseSalary}
                    onChange={(value) =>
                      setForm({
                        ...form,
                        baseSalary: value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Tipo de salário
                  </label>

                  <select
                    className={fieldClass}
                    value={form.salaryType}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        salaryType: e.target
                          .value as SalaryType | "",
                      })
                    }
                  >
                    <option value="">Selecione...</option>

                    {Object.entries(SALARY_TYPE_LABELS).map(
                      ([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div className="sm:col-span-2 lg:col-span-4">
                  <label className={labelClass}>
                    Descrição das atividades
                  </label>

                  <input
                    className={fieldClass}
                    value={form.description}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        description: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="rounded-xl border border-[var(--border)] p-4">
                <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
                  <input
                    type="checkbox"
                    checked={form.requiresPpe}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        requiresPpe: e.target.checked,
                        ppeTypeIds: e.target.checked
                          ? form.ppeTypeIds
                          : [],
                      })
                    }
                  />
                  Esta função exige uso de EPI
                </label>

                {form.requiresPpe && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {ppeTypes.length === 0 ? (
                      <p className="text-xs text-[var(--text-muted)]">
                        Nenhum tipo de EPI cadastrado ainda —
                        cadastre em &quot;Setores, horários e
                        EPI&quot;.
                      </p>
                    ) : (
                      ppeTypes.map((ppe) => (
                        <label
                          key={ppe.id}
                          className="flex items-center gap-2 text-sm text-[var(--text-secondary)]"
                        >
                          <input
                            type="checkbox"
                            checked={form.ppeTypeIds.includes(
                              ppe.id
                            )}
                            onChange={() => togglePpe(ppe.id)}
                          />
                          {ppe.name}
                        </label>
                      ))
                    )}
                  </div>
                )}
              </div>

              {formError && (
                <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                  {formError}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="rounded-xl border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--text-secondary)]"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void save()}
                  className="rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] disabled:opacity-60"
                >
                  {saving ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
