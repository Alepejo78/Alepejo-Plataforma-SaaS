"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/providers/AuthProvider";
import { Can } from "@/components/auth/Can";

import type { Role } from "@/services/role.service";
import type {
  SystemUser,
  UserPayload,
} from "@/services/user.service";
import { companyService, type Company } from "@/services/company.service";

const fieldClass = `
  h-11 w-full rounded-xl border border-[var(--border)]
  bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)]
  outline-none transition-colors
  focus:border-[var(--primary)]
`;

const readOnlyFieldClass = `
  h-11 w-full rounded-xl border border-[var(--border)]
  bg-[var(--surface-hover)] px-3 text-sm text-[var(--text-muted)]
`;

const labelClass =
  "mb-1 block text-sm font-medium text-[var(--text-secondary)]";

const emptyForm: UserPayload = {
  name: "",
  email: "",
  department: "",
  manager: "",
  alias: "",
  roleId: "",
  companyIds: [],
};

interface Props {
  user?: SystemUser | null;
  /** Pré-preenche os campos com os dados de outro usuário (ação "Copiar") */
  copyFrom?: SystemUser | null;
  roles: Role[];
  saving: boolean;
  error?: string;
  onSubmit: (payload: UserPayload) => void;
  onCancel: () => void;
}

export function UserForm({
  user,
  copyFrom,
  roles,
  saving,
  error,
  onSubmit,
  onCancel,
}: Props) {
  const { user: currentUser } = useAuth();

  const [form, setForm] = useState<UserPayload>(emptyForm);
  const [groupCompanies, setGroupCompanies] = useState<Company[]>([]);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name,
        email: user.email,
        department: user.department ?? "",
        manager: user.manager ?? "",
        alias: user.alias ?? "",
        roleId: user.roles?.[0]?.role.id ?? "",
        companyIds: user.companies?.map((c) => c.companyId) ?? [],
      });
    } else if (copyFrom) {
      setForm({
        name: "",
        email: "",
        department: copyFrom.department ?? "",
        manager: copyFrom.manager ?? "",
        alias: copyFrom.alias ?? "",
        roleId: copyFrom.roles?.[0]?.role.id ?? "",
        companyIds: copyFrom.companies?.map((c) => c.companyId) ?? [],
      });
    } else {
      setForm(emptyForm);
    }
  }, [user, copyFrom]);

  useEffect(() => {
    let active = true;

    companyService
      .listGroup()
      .then((items) => {
        if (active) {
          setGroupCompanies(items);
        }
      })
      .catch(() => {
        if (active) {
          setGroupCompanies([]);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  function setField(field: keyof UserPayload, value: string) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  const homeCompanyId = currentUser?.companyId ?? "";

  function toggleCompany(companyId: string) {
    if (companyId === homeCompanyId) {
      return;
    }

    setForm((previous) => {
      const current = previous.companyIds ?? [];
      const next = current.includes(companyId)
        ? current.filter((id) => id !== companyId)
        : [...current, companyId];

      return { ...previous, companyIds: next };
    });
  }

  const otherCompanies = groupCompanies.filter(
    (company) => company.id !== homeCompanyId
  );
  const allOthersChecked =
    otherCompanies.length > 0 &&
    otherCompanies.every((company) =>
      (form.companyIds ?? []).includes(company.id)
    );

  function toggleAllCompanies() {
    setForm((previous) => ({
      ...previous,
      companyIds: allOthersChecked
        ? []
        : otherCompanies.map((company) => company.id),
    }));
  }

  function handleSubmit() {
    onSubmit({
      name: form.name.trim(),
      email: form.email.trim(),
      department: form.department?.trim() || undefined,
      manager: form.manager?.trim() || undefined,
      alias: form.alias?.trim() || undefined,
      roleId: form.roleId || undefined,
      companyIds: form.companyIds,
    });
  }

  const companyName =
    currentUser?.company.tradeName ||
    currentUser?.company.legalName ||
    "—";

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className={labelClass} htmlFor="name">
            Nome <span className="text-[var(--danger)]">*</span>
          </label>

          <input
            id="name"
            className={fieldClass}
            value={form.name}
            onChange={(e) => setField("name", e.target.value)}
          />
        </div>

        <div>
          <span className={labelClass}>Empresa</span>

          <div className={readOnlyFieldClass}>{companyName}</div>
        </div>

        <div>
          <label className={labelClass} htmlFor="email">
            E-mail <span className="text-[var(--danger)]">*</span>
          </label>

          <input
            id="email"
            type="email"
            className={fieldClass}
            disabled={!!user}
            value={form.email}
            onChange={(e) => setField("email", e.target.value)}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="department">
            Departamento
          </label>

          <input
            id="department"
            className={fieldClass}
            value={form.department ?? ""}
            onChange={(e) =>
              setField("department", e.target.value)
            }
          />
        </div>

        {user && (
          <div>
            <span className={labelClass}>
              Nome do Usuário Login
            </span>

            <div className={readOnlyFieldClass}>
              {form.email} — mesmo e-mail, inalterado posterior
            </div>
          </div>
        )}

        <div>
          <label className={labelClass} htmlFor="manager">
            Gerente
          </label>

          <input
            id="manager"
            className={fieldClass}
            value={form.manager ?? ""}
            onChange={(e) => setField("manager", e.target.value)}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="alias">
            Alias do Usuário
          </label>

          <input
            id="alias"
            className={fieldClass}
            value={form.alias ?? ""}
            onChange={(e) => setField("alias", e.target.value)}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="roleId">
            Perfil de segurança
          </label>

          <select
            id="roleId"
            className={fieldClass}
            value={form.roleId ?? ""}
            onChange={(e) => setField("roleId", e.target.value)}
          >
            <option value="">Nenhum</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      {otherCompanies.length > 0 && (
        <Can permission="company.update">
          <section>
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className={labelClass}>
                Empresas com acesso (login cruzado)
              </span>

              <button
                type="button"
                onClick={toggleAllCompanies}
                className="text-xs font-medium text-[var(--primary)] hover:underline"
              >
                {allOthersChecked
                  ? "Desmarcar todas"
                  : "Marcar todas"}
              </button>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <label className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] px-3 py-2 text-sm text-[var(--text-muted)]">
                <input type="checkbox" checked disabled />
                {companyName} (atual)
              </label>

              {otherCompanies.map((company) => (
                <label
                  key={company.id}
                  className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-secondary)]"
                >
                  <input
                    type="checkbox"
                    checked={(form.companyIds ?? []).includes(
                      company.id
                    )}
                    onChange={() => toggleCompany(company.id)}
                  />
                  {company.tradeName || company.legalName}
                </label>
              ))}
            </div>
          </section>
        </Can>
      )}

      {!user && (
        <p className="text-sm text-[var(--text-muted)]">
          O usuário nasce pendente de ativação — depois de salvar, use
          a ação &quot;Alterar Senha&quot; na lista para enviar o
          e-mail de acesso.
        </p>
      )}

      {error && (
        <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)]"
        >
          Cancelar
        </button>

        <button
          type="button"
          disabled={saving}
          onClick={handleSubmit}
          className="rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-60"
        >
          {saving ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </div>
  );
}
