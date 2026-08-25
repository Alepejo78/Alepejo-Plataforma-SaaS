"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ChevronDown,
  Copy,
  Lock,
  Plus,
  ShieldCheck,
  Unlock,
  UserCheck,
  UserX,
  X,
} from "lucide-react";

import { OsShell } from "@/components";
import { Can } from "@/components/auth/Can";
import { ListPageLayout } from "@/components/layout/ListPageLayout";
import { UserForm } from "@/components/security/UserForm";
import { useAuth } from "@/providers/AuthProvider";

import { roleService, type Role } from "@/services/role.service";
import {
  companyService,
  type Company,
} from "@/services/company.service";
import {
  userService,
  type SystemUser,
  type UserPayload,
} from "@/services/user.service";

function extractMessage(err: unknown, fallback: string) {
  const message = (
    err as { response?: { data?: { message?: unknown } } }
  )?.response?.data?.message;

  if (Array.isArray(message)) {
    return message.join(" ");
  }

  return typeof message === "string" ? message : fallback;
}

function formatDate(value?: string | null) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString("pt-BR");
}

function isBlocked(user: SystemUser) {
  return (
    !!user.lockedUntil && new Date(user.lockedUntil) > new Date()
  );
}

function statusBadge(user: SystemUser) {
  if (!user.active) {
    return (
      <span className="rounded bg-[var(--surface-hover)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--text-muted)]">
        Inativo
      </span>
    );
  }

  if (isBlocked(user)) {
    return (
      <span className="rounded bg-[var(--danger-soft)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--danger)]">
        Bloqueado
      </span>
    );
  }

  return (
    <span className="rounded bg-[var(--success-soft)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--success)]">
      Ativo
    </span>
  );
}

export default function UsuariosPage() {
  const { user: currentUser, refreshUser } = useAuth();

  const [users, setUsers] = useState<SystemUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [groupCompanies, setGroupCompanies] = useState<Company[]>(
    []
  );

  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [actionMenuOpen, setActionMenuOpen] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SystemUser | null>(null);
  const [copyFrom, setCopyFrom] = useState<SystemUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setListError("");

    try {
      const [userList, roleList, groupCompanyList] =
        await Promise.all([
          userService.list(),
          roleService.list(),
          companyService.listGroup(),
        ]);

      setUsers(userList);
      setRoles(roleList);
      setGroupCompanies(groupCompanyList);
    } catch (err) {
      setListError(
        extractMessage(
          err,
          "Não foi possível carregar os usuários."
        )
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function toggleSelected(id: string) {
    setSelected((previous) => {
      const next = new Set(previous);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }

  function openCreate() {
    setEditing(null);
    setCopyFrom(null);
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(user: SystemUser) {
    setEditing(user);
    setCopyFrom(null);
    setFormError("");
    setModalOpen(true);
  }

  async function handleSubmit(payload: UserPayload) {
    setSaving(true);
    setFormError("");

    try {
      if (editing) {
        await userService.update(editing.id, payload);

        // Editei minha própria conta (ex.: marquei uma empresa nova
        // pra login cruzado) — recarrega a sessão pra o seletor de
        // empresa no topo já refletir sem precisar de F5.
        if (editing.id === currentUser?.id) {
          await refreshUser();
        }
      } else {
        await userService.create(payload);
      }

      setModalOpen(false);

      await load();
    } catch (err) {
      setFormError(
        extractMessage(err, "Não foi possível salvar o usuário.")
      );
    } finally {
      setSaving(false);
    }
  }

  async function runAction(
    action: (id: string) => Promise<unknown>,
    successMessage: string
  ) {
    setActionMenuOpen(false);
    setListError("");
    setActionMessage("");

    try {
      await Promise.all(
        Array.from(selected).map((id) => action(id))
      );

      setActionMessage(successMessage);
      setSelected(new Set());

      await load();
    } catch (err) {
      setListError(
        extractMessage(err, "Não foi possível concluir a ação.")
      );
    }
  }

  function handleCopy() {
    setActionMenuOpen(false);

    const [id] = Array.from(selected);
    const source = users.find((user) => user.id === id);

    if (!source) {
      return;
    }

    setEditing(null);
    setCopyFrom(source);
    setFormError("");
    setModalOpen(true);
  }

  const selectedCount = selected.size;

  return (
    <OsShell workspaceLabel="Usuários">
      <ListPageLayout
        header={
          <>
            <header className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                  Usuários
                </h1>

                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Cadastro de usuários do sistema e vínculo com
                  perfis de segurança.
                </p>
              </div>

              <div className="flex gap-2">
                <div className="relative">
                  <button
                    type="button"
                    disabled={selectedCount === 0}
                    onClick={() =>
                      setActionMenuOpen((previous) => !previous)
                    }
                    className="flex h-full items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] disabled:opacity-40"
                  >
                    Ação
                    <ChevronDown size={16} />
                  </button>

                  {actionMenuOpen && selectedCount > 0 && (
                    <div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-[var(--border)] bg-[var(--surface)] py-1 shadow-lg">
                      <Can permission="user.activate">
                        <button
                          type="button"
                          onClick={() =>
                            void runAction(
                              (id) => userService.activate(id),
                              "Usuário(s) ativado(s)."
                            )
                          }
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                        >
                          <UserCheck size={16} />
                          Ativar
                        </button>
                      </Can>

                      <Can permission="user.deactivate">
                        <button
                          type="button"
                          onClick={() =>
                            void runAction(
                              (id) => userService.deactivate(id),
                              "Usuário(s) desativado(s)."
                            )
                          }
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                        >
                          <UserX size={16} />
                          Desativar
                        </button>
                      </Can>

                      {selectedCount === 1 && (
                        <Can permission="user.create">
                          <button
                            type="button"
                            onClick={handleCopy}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                          >
                            <Copy size={16} />
                            Copiar
                          </button>
                        </Can>
                      )}

                      <Can permission="user.reset-password">
                        <button
                          type="button"
                          onClick={() =>
                            void runAction(
                              (id) =>
                                userService.requestPasswordReset(id),
                              "E-mail de redefinição enviado."
                            )
                          }
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                        >
                          <ShieldCheck size={16} />
                          Alterar Senha
                        </button>
                      </Can>

                      <Can permission="user.block">
                        <button
                          type="button"
                          onClick={() =>
                            void runAction(
                              (id) => userService.block(id),
                              "Conta(s) bloqueada(s)."
                            )
                          }
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                        >
                          <Lock size={16} />
                          Bloquear Conta
                        </button>
                      </Can>

                      <Can permission="user.unblock">
                        <button
                          type="button"
                          onClick={() =>
                            void runAction(
                              (id) => userService.unblock(id),
                              "Conta(s) desbloqueada(s)."
                            )
                          }
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                        >
                          <Unlock size={16} />
                          Desbloquear
                        </button>
                      </Can>
                    </div>
                  )}
                </div>

                <Can permission="user.create">
                  <button
                    type="button"
                    onClick={openCreate}
                    className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)]"
                  >
                    <Plus size={18} />
                    Novo usuário
                  </button>
                </Can>
              </div>
            </header>

            {actionMessage && (
              <div className="rounded-xl border border-[var(--success)] bg-[var(--success-soft)] p-3 text-sm text-[var(--success)]">
                {actionMessage}
              </div>
            )}

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
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="h-14 animate-pulse rounded-xl bg-[var(--surface-hover)]"
              />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-medium text-[var(--text-primary)]">
              Nenhum usuário encontrado
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-[var(--surface-hover)] text-[var(--text-secondary)]">
                <tr>
                  <th className="w-10 px-4 py-3" />
                  <th className="px-4 py-3 font-semibold">Nome</th>
                  <th className="px-4 py-3 font-semibold">
                    E-mail
                  </th>
                  {groupCompanies.length > 1 && (
                    <th className="px-4 py-3 font-semibold">
                      Empresa
                    </th>
                  )}
                  <th className="px-4 py-3 font-semibold">
                    Departamento
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Perfil
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Último logon
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Status
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Senha expirada
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Definição concluída
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>

              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-t border-[var(--border)]"
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(user.id)}
                        onChange={() => toggleSelected(user.id)}
                      />
                    </td>

                    <td className="px-4 py-3 font-medium text-[var(--text-primary)]">
                      {user.name}
                    </td>

                    <td className="px-4 py-3 text-[var(--text-secondary)]">
                      {user.email}
                    </td>

                    {groupCompanies.length > 1 && (
                      <td className="px-4 py-3 text-[var(--text-secondary)]">
                        {groupCompanies.find(
                          (company) => company.id === user.companyId
                        )?.tradeName ||
                          groupCompanies.find(
                            (company) =>
                              company.id === user.companyId
                          )?.legalName ||
                          "—"}
                      </td>
                    )}

                    <td className="px-4 py-3 text-[var(--text-secondary)]">
                      {user.department || "—"}
                    </td>

                    <td className="px-4 py-3 text-[var(--text-secondary)]">
                      {user.roles?.[0]?.role.name || "—"}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap text-[var(--text-secondary)]">
                      {formatDate(user.lastLoginAt)}
                    </td>

                    <td className="px-4 py-3">
                      {statusBadge(user)}
                    </td>

                    <td className="px-4 py-3 text-[var(--text-secondary)]">
                      {user.status === "PASSWORD_EXPIRED"
                        ? "Sim"
                        : "Não"}
                    </td>

                    <td className="px-4 py-3 text-[var(--text-secondary)]">
                      {user.mustChangePassword ? "Não" : "Sim"}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Can permission="user.update">
                          <button
                            type="button"
                            onClick={() => openEdit(user)}
                            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                          >
                            Editar
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

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-8 w-full max-w-5xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                {editing ? "Editar usuário" : "Novo usuário"}
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

            <UserForm
              user={editing}
              copyFrom={copyFrom}
              roles={roles}
              saving={saving}
              error={formError}
              onSubmit={handleSubmit}
              onCancel={() => setModalOpen(false)}
            />
          </div>
        </div>
      )}
    </OsShell>
  );
}
