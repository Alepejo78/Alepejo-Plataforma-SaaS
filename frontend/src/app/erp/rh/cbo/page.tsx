"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Pencil, Plus, Trash2, X } from "lucide-react";

import { OsShell } from "@/components";
import { Can } from "@/components/auth/Can";
import { ListPageLayout } from "@/components/layout/ListPageLayout";

import { cboService, type CboOccupation } from "@/services/hr.service";

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
  code: string;
  title: string;
}

function emptyForm(): FormState {
  return { code: "", title: "" };
}

export default function CboPage() {
  const [items, setItems] = useState<CboOccupation[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [search, setSearch] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<string | null>(
    null
  );
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [actionError, setActionError] = useState("");

  const load = useCallback(async (term: string) => {
    setLoading(true);
    setListError("");

    try {
      const result = await cboService.listPaged({
        search: term || undefined,
        limit: 50,
      });

      setItems(result.data);
      setTotal(result.total);
    } catch (err) {
      setListError(
        extractMessage(
          err,
          "Não foi possível carregar a tabela CBO."
        )
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(search), 300);

    return () => clearTimeout(timer);
  }, [search, load]);

  function openCreate() {
    setEditingCode(null);
    setForm(emptyForm());
    setFormError("");
    setFormOpen(true);
  }

  function openEdit(item: CboOccupation) {
    setEditingCode(item.code);
    setForm({ code: item.code, title: item.title });
    setFormError("");
    setFormOpen(true);
  }

  async function save() {
    if (!editingCode && !form.code.trim()) {
      setFormError("Informe o código CBO.");

      return;
    }

    if (!form.title.trim()) {
      setFormError("Informe o título da ocupação.");

      return;
    }

    setSaving(true);
    setFormError("");

    try {
      if (editingCode) {
        await cboService.update(editingCode, form.title.trim());
      } else {
        await cboService.create({
          code: form.code.trim(),
          title: form.title.trim(),
        });
      }

      setFormOpen(false);

      await load(search);
    } catch (err) {
      setFormError(
        extractMessage(
          err,
          "Não foi possível salvar o CBO."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: CboOccupation) {
    if (
      !window.confirm(
        `Excluir o CBO ${item.code} — ${item.title}? Funções que já usam este código continuam com o texto salvo, só some do autocomplete.`
      )
    ) {
      return;
    }

    setActionError("");

    try {
      await cboService.remove(item.code);

      await load(search);
    } catch (err) {
      setActionError(
        extractMessage(
          err,
          "Não foi possível excluir o CBO."
        )
      );
    }
  }

  return (
    <OsShell workspaceLabel="Tabela CBO">
      <ListPageLayout
        header={
          <>
            <Link
              href="/os/configuracoes/rh"
              className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            >
              <ArrowLeft size={16} />
              Voltar para Configurações — RH
            </Link>

            <header className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                  Tabela CBO
                </h1>

                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Catálogo global de ocupações (Classificação
                  Brasileira de Ocupações) — usado no autocomplete
                  de CBO em Funções, de todas as empresas. O
                  dataset importado não é completo; cadastre aqui
                  o que faltar.
                </p>
              </div>

              <Can permission="platform.cbo.manage">
                <button
                  type="button"
                  onClick={openCreate}
                  className="flex items-center gap-1.5 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-contrast)]"
                >
                  <Plus size={16} />
                  Novo CBO
                </button>
              </Can>
            </header>

            <input
              className={fieldClass}
              placeholder="Buscar por código ou título (ex.: 2527-15, analista de logística)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {actionError && (
              <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                {actionError}
              </div>
            )}
          </>
        }
      >
        {listError ? (
          <div className="p-6 text-sm text-[var(--danger)]">
            {listError}
          </div>
        ) : loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="h-10 animate-pulse rounded-lg bg-[var(--surface-hover)]"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="p-6 text-center text-sm text-[var(--text-muted)]">
            Nenhum CBO encontrado{search ? " para essa busca" : ""}.
          </p>
        ) : (
          <>
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-[var(--surface)] text-[var(--text-secondary)]">
                <tr className="border-b border-[var(--border)]">
                  <th className="px-4 py-3 font-semibold">
                    Código
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Título
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>

              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.code}
                    className="border-b border-[var(--border)] last:border-0"
                  >
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[var(--text-primary)]">
                      {item.code}
                    </td>

                    <td className="px-4 py-2.5 text-[var(--text-primary)]">
                      {item.title}
                    </td>

                    <td className="whitespace-nowrap px-4 py-2.5 text-right">
                      <Can permission="platform.cbo.manage">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(item)}
                            aria-label="Editar"
                            className="rounded-lg border border-[var(--border)] p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)]"
                          >
                            <Pencil size={14} />
                          </button>

                          <button
                            type="button"
                            onClick={() => void remove(item)}
                            aria-label="Excluir"
                            className="rounded-lg border border-[var(--border)] p-1.5 text-[var(--text-secondary)] transition-colors hover:border-[var(--danger)] hover:text-[var(--danger)]"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </Can>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p className="p-3 text-xs text-[var(--text-muted)]">
              Mostrando {items.length} de {total} resultado(s)
              {total > items.length
                ? " — refine a busca para achar mais rápido"
                : ""}
              .
            </p>
          </>
        )}
      </ListPageLayout>

      {formOpen && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-8 w-full max-w-lg rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                {editingCode ? "Editar CBO" : "Novo CBO"}
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

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className={labelClass}>Código</label>

                <input
                  className={fieldClass}
                  placeholder="2527-15"
                  maxLength={10}
                  disabled={!!editingCode}
                  value={form.code}
                  onChange={(e) =>
                    setForm({ ...form, code: e.target.value })
                  }
                />
              </div>

              <div className="sm:col-span-2">
                <label className={labelClass}>Título</label>

                <input
                  className={fieldClass}
                  placeholder="Analista de logística"
                  maxLength={200}
                  value={form.title}
                  onChange={(e) =>
                    setForm({ ...form, title: e.target.value })
                  }
                />
              </div>
            </div>

            {formError && (
              <div className="mt-4 rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                {formError}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
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
      )}
    </OsShell>
  );
}
