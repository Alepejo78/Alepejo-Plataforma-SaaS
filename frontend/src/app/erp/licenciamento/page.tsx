"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  Pencil,
  X,
} from "lucide-react";

import { OsShell } from "@/components";
import { Can } from "@/components/auth/Can";

import {
  licenseService,
  type MyLicense,
} from "@/services/license.service";
import { companyOnboardingService } from "@/services/company-onboarding.service";
import {
  companyService,
  type Company,
} from "@/services/company.service";
import { maskDocument, onlyDigits } from "@/lib/masks";

function formatDate(value?: string | null) {
  if (!value) {
    return null;
  }

  return new Date(value).toLocaleDateString("pt-BR");
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

const emptyAdditionalForm = {
  legalName: "",
  tradeName: "",
  document: "",
  email: "",
  phone: "",
  adminName: "",
  adminEmail: "",
};

function AddCompanyModal({ onClose }: { onClose: (created: boolean) => void }) {
  const [form, setForm] = useState(emptyAdditionalForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  function setField(
    field: keyof typeof emptyAdditionalForm,
    value: string
  ) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  async function handleSubmit() {
    setSaving(true);
    setError("");

    try {
      await companyOnboardingService.createAdditional({
        legalName: form.legalName.trim(),
        tradeName: form.tradeName.trim() || undefined,
        document: onlyDigits(form.document),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        adminName: form.adminName.trim(),
        adminEmail: form.adminEmail.trim(),
      });

      setDone(true);
    } catch (err) {
      setError(
        extractMessage(err, "Não foi possível cadastrar a empresa.")
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="my-8 w-full max-w-2xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">
            Cadastrar empresa
          </h2>

          <button
            type="button"
            onClick={() => onClose(done)}
            aria-label="Fechar"
            className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)]"
          >
            <X size={18} />
          </button>
        </div>

        {done ? (
          <div className="space-y-4">
            <p className="text-sm text-[var(--success)]">
              Empresa cadastrada — herdou o mesmo plano e módulos da
              sua empresa, e o seu usuário já ganhou acesso a ela
              (veja o seletor de empresa no topo da tela). Se{" "}
              <strong>{form.adminEmail}</strong> for um e-mail
              diferente do seu, também enviamos um link pra essa
              pessoa definir a própria senha.
            </p>

            <button
              type="button"
              onClick={() => onClose(true)}
              className="rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)]"
            >
              Fechar
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-[var(--text-muted)]">
              Só é possível cadastrar empresas com a mesma raiz de
              CNPJ (8 primeiros dígitos) da empresa que já tem a
              licença.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="add-legalName">
                  Razão social{" "}
                  <span className="text-[var(--danger)]">*</span>
                </label>

                <input
                  id="add-legalName"
                  className={fieldClass}
                  value={form.legalName}
                  onChange={(e) =>
                    setField("legalName", e.target.value)
                  }
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="add-tradeName">
                  Nome fantasia
                </label>

                <input
                  id="add-tradeName"
                  className={fieldClass}
                  value={form.tradeName}
                  onChange={(e) =>
                    setField("tradeName", e.target.value)
                  }
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="add-document">
                  CNPJ{" "}
                  <span className="text-[var(--danger)]">*</span>
                </label>

                <input
                  id="add-document"
                  inputMode="numeric"
                  placeholder="00.000.000/0000-00"
                  className={fieldClass}
                  value={form.document}
                  onChange={(e) =>
                    setField(
                      "document",
                      maskDocument(e.target.value, "COMPANY")
                    )
                  }
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="add-email">
                  E-mail da empresa
                </label>

                <input
                  id="add-email"
                  type="email"
                  className={fieldClass}
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="add-phone">
                  Telefone
                </label>

                <input
                  id="add-phone"
                  className={fieldClass}
                  value={form.phone}
                  onChange={(e) => setField("phone", e.target.value)}
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="add-adminName">
                  Nome do administrador{" "}
                  <span className="text-[var(--danger)]">*</span>
                </label>

                <input
                  id="add-adminName"
                  className={fieldClass}
                  value={form.adminName}
                  onChange={(e) =>
                    setField("adminName", e.target.value)
                  }
                />
              </div>

              <div>
                <label
                  className={labelClass}
                  htmlFor="add-adminEmail"
                >
                  E-mail do administrador{" "}
                  <span className="text-[var(--danger)]">*</span>
                </label>

                <input
                  id="add-adminEmail"
                  type="email"
                  className={fieldClass}
                  value={form.adminEmail}
                  onChange={(e) =>
                    setField("adminEmail", e.target.value)
                  }
                />
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => onClose(false)}
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
        )}
      </div>
    </div>
  );
}

function EditCompanyModal({
  company,
  onClose,
}: {
  company: Company;
  onClose: (updated: boolean) => void;
}) {
  const [form, setForm] = useState({
    legalName: company.legalName,
    tradeName: company.tradeName ?? "",
    email: company.email ?? "",
    phone: company.phone ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    setSaving(true);
    setError("");

    try {
      await companyService.updateInGroup(company.id, {
        legalName: form.legalName.trim(),
        tradeName: form.tradeName.trim() || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
      });

      onClose(true);
    } catch (err) {
      setError(
        extractMessage(err, "Não foi possível salvar a empresa.")
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="my-8 w-full max-w-2xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">
            Editar empresa
          </h2>

          <button
            type="button"
            onClick={() => onClose(false)}
            aria-label="Fechar"
            className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="edit-legalName">
                Razão social{" "}
                <span className="text-[var(--danger)]">*</span>
              </label>

              <input
                id="edit-legalName"
                className={fieldClass}
                value={form.legalName}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    legalName: e.target.value,
                  }))
                }
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="edit-tradeName">
                Nome fantasia
              </label>

              <input
                id="edit-tradeName"
                className={fieldClass}
                value={form.tradeName}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    tradeName: e.target.value,
                  }))
                }
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="edit-email">
                E-mail
              </label>

              <input
                id="edit-email"
                type="email"
                className={fieldClass}
                value={form.email}
                onChange={(e) =>
                  setForm((p) => ({ ...p, email: e.target.value }))
                }
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="edit-phone">
                Telefone
              </label>

              <input
                id="edit-phone"
                className={fieldClass}
                value={form.phone}
                onChange={(e) =>
                  setForm((p) => ({ ...p, phone: e.target.value }))
                }
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => onClose(false)}
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
  );
}

function GroupCompaniesSection({
  refreshKey,
}: {
  refreshKey: number;
}) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Company | null>(null);
  const [busyId, setBusyId] = useState("");

  function load() {
    setLoading(true);
    setError("");

    companyService
      .listGroup()
      .then(setCompanies)
      .catch(() =>
        setError("Não foi possível carregar as empresas do grupo.")
      )
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  async function toggleActive(company: Company) {
    const action = company.active ? "desativar" : "ativar";

    if (
      !window.confirm(
        `Tem certeza que deseja ${action} "${company.legalName}"?`
      )
    ) {
      return;
    }

    setBusyId(company.id);
    setError("");

    try {
      await companyService.updateInGroup(company.id, {
        active: !company.active,
      });

      load();
    } catch (err) {
      setError(
        extractMessage(err, "Não foi possível alterar a empresa.")
      );
    } finally {
      setBusyId("");
    }
  }

  if (companies.length <= 1 && !loading) {
    // Cliente com uma empresa só — nada de "grupo" a mostrar ainda.
    return null;
  }

  return (
    <section>
      <h2 className="mb-3 text-sm font-medium text-[var(--text-muted)]">
        Empresas do grupo
      </h2>

      {error && (
        <div className="mb-3 flex items-center gap-3 rounded-2xl border border-[var(--danger)] bg-[var(--danger-soft)] p-4 text-sm text-[var(--danger)]">
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      {loading ? (
        <div className="h-24 animate-pulse rounded-2xl bg-[var(--surface-hover)]" />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--surface-hover)] text-[var(--text-secondary)]">
              <tr>
                <th className="px-4 py-3 font-semibold">Empresa</th>
                <th className="px-4 py-3 font-semibold">CNPJ</th>
                <th className="px-4 py-3 font-semibold">Situação</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>

            <tbody>
              {companies.map((company) => (
                <tr
                  key={company.id}
                  className="border-t border-[var(--border)]"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-[var(--text-primary)]">
                      {company.legalName}
                      {!company.rootCompanyId && (
                        <span className="ml-2 rounded bg-[var(--primary-soft)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--primary-text)]">
                          Raiz
                        </span>
                      )}
                    </p>
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap text-[var(--text-secondary)]">
                    {maskDocument(company.document, "COMPANY")}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={
                        company.active
                          ? "text-[var(--success)]"
                          : "text-[var(--text-muted)]"
                      }
                    >
                      {company.active ? "Ativa" : "Inativa"}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditing(company)}
                        aria-label="Editar"
                        className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)]"
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        type="button"
                        disabled={busyId === company.id}
                        onClick={() => void toggleActive(company)}
                        className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] disabled:opacity-50"
                      >
                        {company.active ? "Desativar" : "Ativar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <EditCompanyModal
          company={editing}
          onClose={(updated) => {
            setEditing(null);
            if (updated) {
              load();
            }
          }}
        />
      )}
    </section>
  );
}

export default function LicenciamentoPage() {
  const [license, setLicense] = useState<MyLicense | null>(
    null
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [groupRefreshKey, setGroupRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;

    licenseService
      .me()
      .then((data) => {
        if (active) {
          setLicense(data);
        }
      })
      .catch(() => {
        if (active) {
          setError(
            "Não foi possível carregar as informações de licenciamento."
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <OsShell workspaceLabel="Licenciamento">
      <div className="space-y-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              Licenciamento
            </h1>

            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Plano contratado e módulos disponíveis para sua
              empresa.
            </p>
          </div>

          <Can permission="company.create">
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)]"
            >
              <Building2 size={18} />
              Cadastrar empresa
            </button>
          </Can>
        </header>

        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-24 animate-pulse rounded-2xl bg-[var(--surface-hover)]"
              />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="flex items-center gap-3 rounded-2xl border border-[var(--danger)] bg-[var(--danger-soft)] p-4 text-sm text-[var(--danger)]">
            <AlertTriangle size={18} />
            {error}
          </div>
        )}

        {!loading && !error && license && (
          <>
            <section className="rounded-2xl border border-[var(--border)] p-6">
              <h2 className="text-sm font-medium text-[var(--text-muted)]">
                Plano atual
              </h2>

              {license.companyPlan ? (
                <div className="mt-2">
                  <p className="text-xl font-semibold text-[var(--text-primary)]">
                    {license.companyPlan.plan.name}
                  </p>

                  {license.companyPlan.plan.description && (
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      {license.companyPlan.plan.description}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-6 text-sm text-[var(--text-muted)]">
                    <span>
                      Início:{" "}
                      {formatDate(
                        license.companyPlan.startedAt
                      ) ?? "—"}
                    </span>

                    <span>
                      Expira em:{" "}
                      {formatDate(
                        license.companyPlan.expiresAt
                      ) ?? "sem data de expiração"}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-[var(--text-muted)]">
                  Nenhum plano contratado.
                </p>
              )}
            </section>

            <section>
              <h2 className="mb-3 text-sm font-medium text-[var(--text-muted)]">
                Módulos habilitados
              </h2>

              {license.companyModules.length === 0 ? (
                <p className="text-[var(--text-muted)]">
                  Nenhum módulo habilitado individualmente.
                  O acesso vem do plano contratado.
                </p>
              ) : (
                <ul className="grid gap-3 md:grid-cols-2">
                  {license.companyModules.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-start gap-3 rounded-2xl border border-[var(--border)] p-4"
                    >
                      {item.trial ? (
                        <Clock
                          size={18}
                          className="mt-0.5 shrink-0 text-[var(--warning)]"
                        />
                      ) : (
                        <CheckCircle2
                          size={18}
                          className="mt-0.5 shrink-0 text-[var(--success)]"
                        />
                      )}

                      <div className="min-w-0">
                        <p className="font-medium text-[var(--text-primary)]">
                          {item.module.name}
                        </p>

                        <p className="text-sm text-[var(--text-muted)]">
                          {item.trial
                            ? "Período de avaliação"
                            : "Ativo"}

                          {item.expiresAt &&
                            ` · até ${formatDate(
                              item.expiresAt
                            )}`}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <GroupCompaniesSection refreshKey={groupRefreshKey} />
          </>
        )}
      </div>

      {modalOpen && (
        <AddCompanyModal
          onClose={(created) => {
            setModalOpen(false);
            if (created) {
              setGroupRefreshKey((k) => k + 1);
            }
          }}
        />
      )}
    </OsShell>
  );
}
