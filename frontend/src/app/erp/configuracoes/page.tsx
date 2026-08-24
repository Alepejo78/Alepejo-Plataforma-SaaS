"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Building2,
  Pencil,
  X,
} from "lucide-react";

import { OsShell } from "@/components";
import { Can } from "@/components/auth/Can";

import { companyOnboardingService } from "@/services/company-onboarding.service";
import {
  companyService,
  type Company,
} from "@/services/company.service";
import { maskCEP, maskDocument, onlyDigits } from "@/lib/masks";
import {
  AddressFields,
  emptyAddress,
  type AddressFormState,
} from "@/components/company/AddressFields";

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
  personType: "COMPANY" as "COMPANY" | "INDIVIDUAL",
  document: "",
  isGroupCompany: false,
  email: "",
  phone: "",
};

function AddCompanyModal({ onClose }: { onClose: (created: boolean) => void }) {
  const [form, setForm] = useState(emptyAdditionalForm);
  const [address, setAddress] =
    useState<AddressFormState>(emptyAddress);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const isCompany = form.personType === "COMPANY";

  function setField(
    field: Exclude<
      keyof typeof emptyAdditionalForm,
      "personType" | "isGroupCompany"
    >,
    value: string
  ) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  async function handleSubmit() {
    if (!isCompany && !form.isGroupCompany) {
      setError(
        "Confirme que esta é uma empresa do grupo — CPF não tem raiz pra conferir automaticamente."
      );
      return;
    }

    setSaving(true);
    setError("");

    try {
      await companyOnboardingService.createAdditional({
        legalName: form.legalName.trim(),
        tradeName: form.tradeName.trim() || undefined,
        document: onlyDigits(form.document),
        isGroupCompany: form.isGroupCompany || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        zipCode: onlyDigits(address.zipCode) || undefined,
        street: address.street.trim() || undefined,
        number: address.number.trim() || undefined,
        district: address.district.trim() || undefined,
        city: address.city.trim() || undefined,
        state: address.state.trim() || undefined,
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
      <div className="my-8 w-full max-w-4xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
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
              (veja o seletor de empresa no topo da tela). Pra dar
              acesso a outra pessoa nessa empresa, use Configurações
              &gt; Usuários.
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
              Com CNPJ da mesma raiz (8 primeiros dígitos) da empresa
              que já tem a licença, o vínculo é confirmado sozinho. Em
              qualquer outro caso — CNPJ de raiz diferente ou CPF, que
              não tem raiz pra conferir — marque a caixa abaixo
              confirmando manualmente que é empresa do mesmo grupo.
            </p>

            <div className="grid gap-4 sm:grid-cols-6">
              <div className="sm:col-span-6">
                <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <input
                    type="checkbox"
                    checked={form.isGroupCompany}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        isGroupCompany: e.target.checked,
                      }))
                    }
                  />
                  Esta é uma empresa do mesmo grupo (confirmação
                  manual — CPF não tem raiz, e CNPJ pode não ter a
                  mesma raiz da empresa já licenciada).
                </label>
              </div>

              <div className="sm:col-span-3">
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

              <div className="sm:col-span-1">
                <label
                  className={labelClass}
                  htmlFor="add-personType"
                >
                  Tipo de documento
                </label>

                <select
                  id="add-personType"
                  className={fieldClass}
                  value={form.personType}
                  onChange={(e) => {
                    const personType = e.target.value as
                      | "COMPANY"
                      | "INDIVIDUAL";

                    setForm((previous) => ({
                      ...previous,
                      personType,
                      isGroupCompany: false,
                      document: maskDocument(
                        previous.document,
                        personType
                      ),
                    }));
                  }}
                >
                  <option value="COMPANY">CNPJ</option>
                  <option value="INDIVIDUAL">CPF</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="add-document">
                  {isCompany ? "CNPJ" : "CPF"}{" "}
                  <span className="text-[var(--danger)]">*</span>
                </label>

                <input
                  id="add-document"
                  inputMode="numeric"
                  placeholder={
                    isCompany
                      ? "00.000.000/0000-00"
                      : "000.000.000-00"
                  }
                  className={fieldClass}
                  value={form.document}
                  onChange={(e) =>
                    setField(
                      "document",
                      maskDocument(e.target.value, form.personType)
                    )
                  }
                />
              </div>

              <div className="sm:col-span-3">
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

              <div className="sm:col-span-2">
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

              <div className="sm:col-span-1">
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

              <AddressFields
                idPrefix="add"
                value={address}
                onChange={setAddress}
              />
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
  const [address, setAddress] = useState<AddressFormState>({
    zipCode: company.zipCode ? maskCEP(company.zipCode) : "",
    street: company.street ?? "",
    number: company.number ?? "",
    district: company.district ?? "",
    city: company.city ?? "",
    state: company.state ?? "",
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
        zipCode: onlyDigits(address.zipCode) || undefined,
        street: address.street.trim() || undefined,
        number: address.number.trim() || undefined,
        district: address.district.trim() || undefined,
        city: address.city.trim() || undefined,
        state: address.state.trim() || undefined,
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
      <div className="my-8 w-full max-w-4xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
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
          <div className="grid gap-4 sm:grid-cols-6">
            <div className="sm:col-span-3">
              <label className={labelClass} htmlFor="edit-legalName">
                Razão social
              </label>

              <input
                id="edit-legalName"
                disabled
                className={`${fieldClass} cursor-not-allowed opacity-60`}
                value={form.legalName}
              />
            </div>

            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="edit-document">
                {onlyDigits(company.document).length === 11
                  ? "CPF"
                  : "CNPJ"}
              </label>

              <input
                id="edit-document"
                disabled
                className={`${fieldClass} cursor-not-allowed opacity-60`}
                value={maskDocument(company.document)}
              />
            </div>

            <div className="sm:col-span-1">
              <label className={labelClass} htmlFor="edit-code">
                Código
              </label>

              <input
                id="edit-code"
                disabled
                title="Código da empresa — não pode ser alterado."
                className={`${fieldClass} cursor-not-allowed opacity-60`}
                value={company.code}
              />
            </div>

            <div className="sm:col-span-3">
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

            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="edit-email">
                E-mail da empresa
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

            <div className="sm:col-span-1">
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

            <AddressFields
              idPrefix="edit"
              value={address}
              onChange={setAddress}
            />
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

/** Tabela reutilizada tanto pra empresa raiz quanto pras empresas do grupo. */
function CompanyTable({
  companies,
  onEdit,
  onToggleActive,
  busyId,
}: {
  companies: Company[];
  onEdit: (company: Company) => void;
  onToggleActive: (company: Company) => void;
  busyId: string;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
      <table className="w-full text-left text-sm">
        <thead className="bg-[var(--surface-hover)] text-[var(--text-secondary)]">
          <tr>
            <th className="px-4 py-3 font-semibold">Empresa</th>
            <th className="px-4 py-3 font-semibold">Documento</th>
            <th className="px-4 py-3 font-semibold">E-mail</th>
            <th className="px-4 py-3 font-semibold">Telefone</th>
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
                {maskDocument(company.document)}
              </td>

              <td className="px-4 py-3 text-[var(--text-secondary)]">
                {company.email || "—"}
              </td>

              <td className="px-4 py-3 whitespace-nowrap text-[var(--text-secondary)]">
                {company.phone || "—"}
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
                    onClick={() => onEdit(company)}
                    aria-label="Editar"
                    className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)]"
                  >
                    <Pencil size={16} />
                  </button>

                  <button
                    type="button"
                    disabled={busyId === company.id}
                    onClick={() => onToggleActive(company)}
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
  );
}

/**
 * Substitui a antiga "Dados da empresa" (formulário fixo, editava
 * sempre a empresa ativa da sessão) — agora "Empresa" mostra só a
 * empresa RAIZ do grupo, em linha de tabela, e "Empresas do grupo" só
 * as filiais (mesma raiz de CNPJ ou `isGroupCompany` pra CPF — já
 * filtrado pelo backend em `GET /companies/group`). Editar qualquer
 * uma abre o mesmo modal completo (`EditCompanyModal`).
 */
function CompaniesSection({ refreshKey }: { refreshKey: number }) {
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
        setError("Não foi possível carregar as empresas.")
      )
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
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

  const root = companies.find((c) => !c.rootCompanyId) ?? null;
  const groupCompanies = companies.filter((c) => c.rootCompanyId);

  return (
    <div className="space-y-8">
      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-[var(--danger)] bg-[var(--danger-soft)] p-4 text-sm text-[var(--danger)]">
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      <section>
        <h2 className="mb-3 text-sm font-medium text-[var(--text-muted)]">
          Empresa
        </h2>

        {loading ? (
          <div className="h-24 animate-pulse rounded-2xl bg-[var(--surface-hover)]" />
        ) : (
          root && (
            <CompanyTable
              companies={[root]}
              onEdit={setEditing}
              onToggleActive={(c) => void toggleActive(c)}
              busyId={busyId}
            />
          )
        )}
      </section>

      {!loading && groupCompanies.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-medium text-[var(--text-muted)]">
            Empresas do grupo
          </h2>

          <CompanyTable
            companies={groupCompanies}
            onEdit={setEditing}
            onToggleActive={(c) => void toggleActive(c)}
            busyId={busyId}
          />
        </section>
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
    </div>
  );
}

export default function Configuracoes() {
  const [modalOpen, setModalOpen] = useState(false);
  const [groupRefreshKey, setGroupRefreshKey] = useState(0);

  return (
    <OsShell workspaceLabel="Configurações">
      <div className="space-y-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              Empresa
            </h1>

            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Dados da empresa e empresas do mesmo grupo.
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

        <CompaniesSection refreshKey={groupRefreshKey} />
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
