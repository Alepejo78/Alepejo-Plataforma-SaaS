"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";

import { OsShell } from "@/components";
import { Can } from "@/components/auth/Can";
import { ListPageLayout } from "@/components/layout/ListPageLayout";
import { SearchSelect } from "@/components/ui/SearchSelect";
import { maskAccountCode } from "@/lib/masks";

import {
  CHART_OF_ACCOUNT_TYPE_LABELS,
  chartOfAccountService,
  type ChartOfAccount,
  type ChartOfAccountType,
} from "@/services/chart-of-account.service";

import {
  chartOfAccountClassificationService,
  type ChartOfAccountClassification,
} from "@/services/chart-of-account-classification.service";

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

const TYPE_BADGE_CLASS: Record<ChartOfAccountType, string> = {
  RECEITA: "bg-[var(--success-soft)] text-[var(--success)]",
  DESPESA: "bg-[var(--danger-soft)] text-[var(--danger)]",
};

interface Form {
  code: string;
  classificationId: string;
  classificationLabel: string;
  description: string;
  type: ChartOfAccountType;
}

function emptyForm(): Form {
  return {
    code: "",
    classificationId: "",
    classificationLabel: "",
    description: "",
    type: "DESPESA",
  };
}

export default function PlanoContasPage() {
  const [accounts, setAccounts] = useState<ChartOfAccount[]>(
    []
  );

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(
    null
  );
  const [form, setForm] = useState<Form>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [deleteError, setDeleteError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setListError("");

    try {
      const result = await chartOfAccountService.list({
        search: search || undefined,
        type: (typeFilter || undefined) as
          | ChartOfAccountType
          | undefined,
      });

      setAccounts(result.data ?? []);
    } catch (err) {
      setListError(
        extractMessage(
          err,
          "Não foi possível carregar o plano de contas."
        )
      );
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 300);

    return () => clearTimeout(timer);
  }, [load]);

  const searchClassifications = useCallback(
    async (query: string) => {
      const result = await chartOfAccountClassificationService.list(
        query || undefined
      );

      return result.data;
    },
    []
  );

  async function createClassification(name: string) {
    return chartOfAccountClassificationService.create({ name });
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setFormError("");
    setFormOpen(true);
  }

  function openEdit(account: ChartOfAccount) {
    setEditingId(account.id);
    setForm({
      code: account.code,
      classificationId: account.classification.id,
      classificationLabel: account.classification.name,
      description: account.description,
      type: account.type,
    });
    setFormError("");
    setFormOpen(true);
  }

  async function save() {
    if (
      !form.code.trim() ||
      !form.classificationId ||
      !form.description.trim()
    ) {
      setFormError(
        "Preencha código, classificação e descrição."
      );

      return;
    }

    setSaving(true);
    setFormError("");

    try {
      const payload = {
        code: form.code,
        classificationId: form.classificationId,
        description: form.description,
        type: form.type,
      };

      if (editingId) {
        await chartOfAccountService.update(editingId, payload);
      } else {
        await chartOfAccountService.create(payload);
      }

      setFormOpen(false);

      await load();
    } catch (err) {
      setFormError(
        extractMessage(
          err,
          "Não foi possível salvar a conta."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove(account: ChartOfAccount) {
    if (
      !window.confirm(
        `Excluir a conta "${account.code} — ${account.description}"?`
      )
    ) {
      return;
    }

    setDeleteError("");

    try {
      await chartOfAccountService.remove(account.id);

      await load();
    } catch (err) {
      setDeleteError(
        extractMessage(
          err,
          "Não foi possível excluir a conta."
        )
      );
    }
  }

  // Agrupa por classificação, na ordem em que cada grupo aparece
  // (a lista já vem ordenada por código).
  const groups: {
    classificationId: string;
    classificationName: string;
    items: ChartOfAccount[];
  }[] = [];

  for (const account of accounts) {
    const group = groups.find(
      (g) => g.classificationId === account.classification.id
    );

    if (group) {
      group.items.push(account);
    } else {
      groups.push({
        classificationId: account.classification.id,
        classificationName: account.classification.name,
        items: [account],
      });
    }
  }

  return (
    <OsShell workspaceLabel="Financeiro">
      <ListPageLayout
        header={
          <>
            <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                Plano de contas
              </h1>

              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Estrutura de contas usada para classificar
                receitas e despesas.
              </p>
            </div>

            <Can permission="chart-of-account.create">
              <button
                type="button"
                onClick={openCreate}
                className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)]"
              >
                <Plus size={18} />
                Nova conta
              </button>
            </Can>
          </header>

          <div className="flex flex-wrap gap-3">
            <input
              placeholder="Buscar por código, classificação ou descrição"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${fieldClass} min-w-64 flex-1`}
            />

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className={`${fieldClass} max-w-48`}
            >
              <option value="">Todos os tipos</option>
              <option value="DESPESA">Despesa</option>
              <option value="RECEITA">Receita</option>
            </select>
          </div>

          {listError && (
            <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
              {listError}
            </div>
          )}

          {deleteError && (
            <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
              {deleteError}
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
            ) : accounts.length === 0 ? (
              <div className="p-12 text-center">
                <p className="font-medium text-[var(--text-primary)]">
                  Nenhuma conta encontrada
                </p>

                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Use &quot;Nova conta&quot; para cadastrar.
                </p>
              </div>
            ) : (
              groups.map((group) => (
                <div
                  key={group.classificationId}
                  className="border-b border-[var(--border)] last:border-b-0"
                >
                  <div className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface-hover)] px-4 py-2.5 text-sm font-semibold text-[var(--text-secondary)]">
                    {group.classificationName}
                  </div>

                  <table className="w-full text-left text-sm">
                    <tbody>
                      {group.items.map((account) => (
                        <tr
                          key={account.id}
                          className="border-t border-[var(--border)] first:border-t-0"
                        >
                          <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-[var(--text-muted)]">
                            {account.code}
                          </td>

                          <td className="px-4 py-2.5 text-[var(--text-primary)]">
                            {account.description}
                          </td>

                          <td className="whitespace-nowrap px-4 py-2.5">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${TYPE_BADGE_CLASS[account.type]}`}
                            >
                              {
                                CHART_OF_ACCOUNT_TYPE_LABELS[
                                  account.type
                                ]
                              }
                            </span>
                          </td>

                          <td className="px-4 py-2.5">
                            <div className="flex justify-end gap-2">
                              <Can permission="chart-of-account.update">
                                <button
                                  type="button"
                                  onClick={() =>
                                    openEdit(account)
                                  }
                                  title="Editar"
                                  aria-label="Editar"
                                  className="rounded-lg border border-[var(--border)] p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)]"
                                >
                                  <Pencil size={14} />
                                </button>
                              </Can>

                              <Can permission="chart-of-account.delete">
                                <button
                                  type="button"
                                  onClick={() =>
                                    void remove(account)
                                  }
                                  title="Excluir"
                                  aria-label="Excluir"
                                  className="rounded-lg border border-[var(--border)] p-1.5 text-[var(--text-secondary)] transition-colors hover:border-[var(--danger)] hover:text-[var(--danger)]"
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
              ))
            )}
      </ListPageLayout>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-8 w-full max-w-3xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                {editingId ? "Editar conta" : "Nova conta"}
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
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className={labelClass}>
                    Código
                  </label>

                  <input
                    placeholder="00.00.00"
                    inputMode="numeric"
                    className={fieldClass}
                    value={form.code}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        code: maskAccountCode(
                          e.target.value
                        ),
                      })
                    }
                  />
                </div>

                <div>
                  <label className={labelClass}>Tipo</label>

                  <select
                    className={fieldClass}
                    value={form.type}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        type: e.target
                          .value as ChartOfAccountType,
                      })
                    }
                  >
                    <option value="DESPESA">Despesa</option>
                    <option value="RECEITA">Receita</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>
                    Classificação
                  </label>

                  <SearchSelect<ChartOfAccountClassification>
                    displayLabel={form.classificationLabel}
                    search={searchClassifications}
                    onCreate={createClassification}
                    getId={(c) => c.id}
                    getLabel={(c) => c.name}
                    placeholder="Buscar ou criar..."
                    onSelect={(c) =>
                      setForm({
                        ...form,
                        classificationId: c?.id ?? "",
                        classificationLabel: c?.name ?? "",
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>
                  Descrição
                </label>

                <input
                  placeholder="Ex.: Certificados"
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
    </OsShell>
  );
}
