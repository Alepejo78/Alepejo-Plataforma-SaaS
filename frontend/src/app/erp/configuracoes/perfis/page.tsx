"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Settings, X } from "lucide-react";
import Link from "next/link";

import { OsShell } from "@/components";
import { Can } from "@/components/auth/Can";
import { ListPageLayout } from "@/components/layout/ListPageLayout";
import { ExportButton } from "@/components/ui/ExportButton";

import {
  roleService,
  type Role,
  type RolePayload,
} from "@/services/role.service";

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
  outline-none transition-colors
  focus:border-[var(--primary)]
`;

const labelClass =
  "mb-1 block text-sm font-medium text-[var(--text-secondary)]";

const emptyForm: RolePayload = {
  code: "",
  name: "",
  description: "",
};

export default function PerfisPage() {
  const exportTableRef = useRef<HTMLTableElement>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [form, setForm] = useState<RolePayload>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setListError("");

    try {
      setRoles(await roleService.list(search));
    } catch (err) {
      setListError(
        extractMessage(err, "Não foi possível carregar os perfis.")
      );
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 300);

    return () => clearTimeout(timer);
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(role: Role) {
    setEditing(role);
    setForm({
      code: role.code,
      name: role.name,
      description: role.description ?? "",
      active: role.active,
    });
    setFormError("");
    setModalOpen(true);
  }

  async function handleSubmit() {
    setSaving(true);
    setFormError("");

    try {
      const payload: RolePayload = {
        code: form.code.trim(),
        name: form.name.trim(),
        description: form.description?.trim() || undefined,
      };

      if (editing) {
        await roleService.update(editing.id, payload);
      } else {
        await roleService.create(payload);
      }

      setModalOpen(false);

      await load();
    } catch (err) {
      setFormError(
        extractMessage(err, "Não foi possível salvar o perfil.")
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(role: Role) {
    const confirmed = window.confirm(
      `Excluir o perfil ${role.name}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      await roleService.remove(role.id);

      await load();
    } catch (err) {
      setListError(
        extractMessage(err, "Não foi possível excluir o perfil.")
      );
    }
  }

  return (
    <OsShell workspaceLabel="Perfis de acesso">
      <ListPageLayout
        header={
          <>
            <header className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                  Perfis de acesso
                </h1>

                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Perfis de segurança e a matriz de permissões de
                  cada um.
                </p>
              </div>

              <div className="flex gap-2">
                <ExportButton
                  tableRef={exportTableRef}
                  filename="perfis-de-acesso"
                  sheetName="Perfis de acesso"
                />

                <Can permission="role.create">
                  <button
                    type="button"
                    onClick={openCreate}
                    className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)]"
                  >
                    <Plus size={18} />
                    Novo perfil
                  </button>
                </Can>
              </div>
            </header>

            <input
              placeholder="Buscar por nome ou código"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--primary)]"
            />

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
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-14 animate-pulse rounded-xl bg-[var(--surface-hover)]"
              />
            ))}
          </div>
        ) : roles.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-medium text-[var(--text-primary)]">
              Nenhum perfil encontrado
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table ref={exportTableRef} className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-[var(--surface-hover)] text-[var(--text-secondary)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Nome</th>
                  <th className="px-4 py-3 font-semibold">
                    Código
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Descrição
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Situação
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>

              <tbody>
                {roles.map((role) => (
                  <tr
                    key={role.id}
                    className="border-t border-[var(--border)]"
                  >
                    <td className="px-4 py-3 font-medium text-[var(--text-primary)]">
                      {role.name}
                    </td>

                    <td className="px-4 py-3 text-[var(--text-secondary)]">
                      {role.code}
                    </td>

                    <td className="px-4 py-3 text-[var(--text-secondary)]">
                      {role.description || "—"}
                    </td>

                    <td className="px-4 py-3 text-[var(--text-secondary)]">
                      {role.active ? "Ativo" : "Inativo"}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Can permission="role-permission.manage">
                          <Link
                            href={`/erp/configuracoes/perfis/${role.id}/permissoes`}
                            className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                          >
                            <Settings size={14} />
                            Configurar permissões
                          </Link>
                        </Can>

                        <Can permission="role.update">
                          <button
                            type="button"
                            onClick={() => openEdit(role)}
                            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                          >
                            Editar
                          </button>
                        </Can>

                        {!role.isSystem && (
                          <Can permission="role.delete">
                            <button
                              type="button"
                              onClick={() =>
                                void handleRemove(role)
                              }
                              className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--danger)] hover:text-[var(--danger)]"
                            >
                              Excluir
                            </button>
                          </Can>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ListPageLayout>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-8 w-full max-w-2xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                {editing ? "Editar perfil" : "Novo perfil"}
              </h2>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Fechar"
                className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor="code">
                    Código{" "}
                    <span className="text-[var(--danger)]">*</span>
                  </label>

                  <input
                    id="code"
                    className={fieldClass}
                    value={form.code}
                    onChange={(e) =>
                      setForm((previous) => ({
                        ...previous,
                        code: e.target.value.toUpperCase(),
                      }))
                    }
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor="name">
                    Nome{" "}
                    <span className="text-[var(--danger)]">*</span>
                  </label>

                  <input
                    id="name"
                    className={fieldClass}
                    value={form.name}
                    onChange={(e) =>
                      setForm((previous) => ({
                        ...previous,
                        name: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div>
                <label className={labelClass} htmlFor="description">
                  Descrição
                </label>

                <input
                  id="description"
                  className={fieldClass}
                  value={form.description ?? ""}
                  onChange={(e) =>
                    setForm((previous) => ({
                      ...previous,
                      description: e.target.value,
                    }))
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
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)]"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleSubmit()}
                  className="rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-60"
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
