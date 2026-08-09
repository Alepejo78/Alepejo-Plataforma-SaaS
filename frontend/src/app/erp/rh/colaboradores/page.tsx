"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  Pencil,
  Plus,
  Trash2,
  UserCog,
  X,
} from "lucide-react";

import { AppShell } from "@/components";
import { Can } from "@/components/auth/Can";
import { ListPageLayout } from "@/components/layout/ListPageLayout";
import { SearchSelect } from "@/components/ui/SearchSelect";

import {
  DEPENDENT_RELATIONSHIP_LABELS,
  EDUCATION_LEVEL_LABELS,
  EMPLOYEE_STATUS_LABELS,
  GENDER_LABELS,
  MARITAL_STATUS_LABELS,
  SALARY_TYPE_LABELS,
  employeeService,
  jobFunctionService,
  workScheduleService,
  type AuxiliaryRecord,
  type DependentRelationship,
  type EducationLevel,
  type Employee,
  type EmployeeDependent,
  type EmployeeStatus,
  type Gender,
  type JobFunction,
  type MaritalStatus,
  type SalaryType,
} from "@/services/hr.service";

import {
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
} from "@/services/financial-entry.service";

import { lookupService } from "@/services/lookup.service";
import {
  isValidCEPLength,
  maskCEP,
  maskCPF,
  maskPhone,
  onlyDigits,
} from "@/lib/masks";

function num(value: string | number | null | undefined) {
  return Number(value ?? 0);
}

function money(value: string | number | null | undefined) {
  return num(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function date(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
  });
}

function toDateInput(value: string | null | undefined) {
  return value ? value.slice(0, 10) : "";
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

const STATUS_BADGE_CLASS: Record<EmployeeStatus, string> = {
  EXPERIENCIA: "bg-[var(--primary-soft)] text-[var(--primary)]",
  ATIVO: "bg-[var(--success-soft)] text-[var(--success)]",
  AFASTADO: "bg-[var(--warning-soft)] text-[var(--warning)]",
  DEMITIDO: "bg-[var(--danger-soft)] text-[var(--danger)]",
};

const TABS = [
  "Pessoais",
  "Documentos",
  "Contato",
  "Contratuais",
  "Saúde e benefícios",
  "EPI",
  "Dependentes",
] as const;

type Tab = (typeof TABS)[number];

interface FormState {
  name: string;
  fatherName: string;
  motherName: string;
  birthDate: string;
  gender: Gender | "";
  birthCity: string;
  birthState: string;
  maritalStatus: MaritalStatus | "";
  educationLevel: EducationLevel | "";

  cpf: string;
  rg: string;
  workCard: string;
  workCardSeries: string;
  pis: string;

  zipCode: string;
  street: string;
  number: string;
  district: string;
  city: string;
  state: string;
  phone: string;
  mobile: string;
  email: string;

  jobFunctionId: string;
  jobFunctionLabel: string;
  workScheduleId: string;
  baseSalary: string;
  salaryType: SalaryType | "";
  paymentMethod: PaymentMethod | "";
  admissionDate: string;
  experienceEndDate: string;
  contractEndDate: string;
  terminationDate: string;
  status: EmployeeStatus;

  examDate: string;
  examCompleted: boolean;
  nextExamDate: string;
  noticeDays: string;
  onLeave: boolean;

  transportVoucher: boolean;
  lockerKey: string;
  lockerNumber: string;
  observation: string;
}

function emptyForm(): FormState {
  return {
    name: "",
    fatherName: "",
    motherName: "",
    birthDate: "",
    gender: "",
    birthCity: "",
    birthState: "",
    maritalStatus: "",
    educationLevel: "",

    cpf: "",
    rg: "",
    workCard: "",
    workCardSeries: "",
    pis: "",

    zipCode: "",
    street: "",
    number: "",
    district: "",
    city: "",
    state: "",
    phone: "",
    mobile: "",
    email: "",

    jobFunctionId: "",
    jobFunctionLabel: "",
    workScheduleId: "",
    baseSalary: "",
    salaryType: "",
    paymentMethod: "",
    admissionDate: "",
    experienceEndDate: "",
    contractEndDate: "",
    terminationDate: "",
    status: "EXPERIENCIA",

    examDate: "",
    examCompleted: false,
    nextExamDate: "",
    noticeDays: "",
    onLeave: false,

    transportVoucher: false,
    lockerKey: "",
    lockerNumber: "",
    observation: "",
  };
}

export default function ColaboradoresPage() {
  const [items, setItems] = useState<Employee[]>([]);
  const [schedules, setSchedules] = useState<AuxiliaryRecord[]>(
    []
  );

  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [search, setSearch] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("Pessoais");
  const [editingId, setEditingId] = useState<string | null>(
    null
  );
  const [form, setForm] = useState<FormState>(emptyForm());
  const [dependents, setDependents] = useState<
    EmployeeDependent[]
  >([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [loadingCep, setLoadingCep] = useState(false);

  const [actionError, setActionError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setListError("");

    try {
      const result = await employeeService.list({
        search: search || undefined,
      });

      setItems(result);
    } catch (err) {
      setListError(
        extractMessage(
          err,
          "Não foi possível carregar os colaboradores."
        )
      );
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 300);

    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    workScheduleService
      .list()
      .then((r) => setSchedules(r.data))
      .catch(() => {});
  }, []);

  const searchJobFunctions = useCallback(
    async (query: string) => {
      return jobFunctionService.list({
        search: query || undefined,
        limit: 20,
      });
    },
    []
  );

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setDependents([]);
    setActiveTab("Pessoais");
    setFormError("");
    setFormOpen(true);
  }

  function openEdit(item: Employee) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      fatherName: item.fatherName ?? "",
      motherName: item.motherName ?? "",
      birthDate: toDateInput(item.birthDate),
      gender: item.gender ?? "",
      birthCity: item.birthCity ?? "",
      birthState: item.birthState ?? "",
      maritalStatus: item.maritalStatus ?? "",
      educationLevel: item.educationLevel ?? "",

      cpf: item.cpf ? maskCPF(item.cpf) : "",
      rg: item.rg ?? "",
      workCard: item.workCard ?? "",
      workCardSeries: item.workCardSeries ?? "",
      pis: item.pis ?? "",

      zipCode: item.zipCode ? maskCEP(item.zipCode) : "",
      street: item.street ?? "",
      number: item.number ?? "",
      district: item.district ?? "",
      city: item.city ?? "",
      state: item.state ?? "",
      phone: item.phone ? maskPhone(item.phone) : "",
      mobile: item.mobile ? maskPhone(item.mobile) : "",
      email: item.email ?? "",

      jobFunctionId: item.jobFunctionId ?? "",
      jobFunctionLabel: item.jobFunction?.name ?? "",
      workScheduleId: item.workScheduleId ?? "",
      baseSalary:
        item.baseSalary != null
          ? String(num(item.baseSalary))
          : "",
      salaryType: item.salaryType ?? "",
      paymentMethod: item.paymentMethod ?? "",
      admissionDate: toDateInput(item.admissionDate),
      experienceEndDate: toDateInput(item.experienceEndDate),
      contractEndDate: toDateInput(item.contractEndDate),
      terminationDate: toDateInput(item.terminationDate),
      status: item.status,

      examDate: toDateInput(item.examDate),
      examCompleted: item.examCompleted,
      nextExamDate: toDateInput(item.nextExamDate),
      noticeDays:
        item.noticeDays != null ? String(item.noticeDays) : "",
      onLeave: item.onLeave,

      transportVoucher: item.transportVoucher,
      lockerKey: item.lockerKey ?? "",
      lockerNumber: item.lockerNumber ?? "",
      observation: item.observation ?? "",
    });
    setDependents(
      item.dependents.map((d) => ({
        ...d,
        birthDate: toDateInput(d.birthDate),
      }))
    );
    setActiveTab("Pessoais");
    setFormError("");
    setFormOpen(true);
  }

  async function handleCepLookup(value: string) {
    if (!isValidCEPLength(value)) {
      return;
    }

    setLoadingCep(true);

    try {
      const data = await lookupService.cep(value);

      setForm((prev) => ({
        ...prev,
        street: data.street ?? prev.street,
        district: data.district ?? prev.district,
        city: data.city ?? prev.city,
        state: data.state ?? prev.state,
      }));
    } catch {
      // Silencioso — CEP inválido/não encontrado não deve travar o
      // preenchimento manual do endereço.
    } finally {
      setLoadingCep(false);
    }
  }

  function addDependent() {
    setDependents((prev) => [
      ...prev,
      { name: "", birthDate: "", relationship: undefined },
    ]);
  }

  function updateDependent(
    index: number,
    patch: Partial<EmployeeDependent>
  ) {
    setDependents((prev) =>
      prev.map((dep, i) =>
        i === index ? { ...dep, ...patch } : dep
      )
    );
  }

  function removeDependent(index: number) {
    setDependents((prev) =>
      prev.filter((_, i) => i !== index)
    );
  }

  async function save() {
    if (!form.name.trim()) {
      setActiveTab("Pessoais");
      setFormError("Informe o nome do colaborador.");

      return;
    }

    setSaving(true);
    setFormError("");

    const payload = {
      name: form.name.trim(),
      fatherName: form.fatherName.trim() || undefined,
      motherName: form.motherName.trim() || undefined,
      birthDate: form.birthDate || undefined,
      gender: form.gender || undefined,
      birthCity: form.birthCity.trim() || undefined,
      birthState: form.birthState.trim() || undefined,
      maritalStatus: form.maritalStatus || undefined,
      educationLevel: form.educationLevel || undefined,

      cpf: onlyDigits(form.cpf) || undefined,
      rg: form.rg.trim() || undefined,
      workCard: form.workCard.trim() || undefined,
      workCardSeries: form.workCardSeries.trim() || undefined,
      pis: form.pis.trim() || undefined,

      zipCode: onlyDigits(form.zipCode) || undefined,
      street: form.street.trim() || undefined,
      number: form.number.trim() || undefined,
      district: form.district.trim() || undefined,
      city: form.city.trim() || undefined,
      state: form.state.trim() || undefined,
      phone: onlyDigits(form.phone) || undefined,
      mobile: onlyDigits(form.mobile) || undefined,
      email: form.email.trim() || undefined,

      jobFunctionId: form.jobFunctionId || undefined,
      workScheduleId: form.workScheduleId || undefined,
      baseSalary: form.baseSalary
        ? Number(form.baseSalary.replace(",", "."))
        : undefined,
      salaryType: form.salaryType || undefined,
      paymentMethod: form.paymentMethod || undefined,
      admissionDate: form.admissionDate || undefined,
      experienceEndDate: form.experienceEndDate || undefined,
      contractEndDate: form.contractEndDate || undefined,
      terminationDate: form.terminationDate || undefined,
      status: form.status,

      examDate: form.examDate || undefined,
      examCompleted: form.examCompleted,
      nextExamDate: form.nextExamDate || undefined,
      noticeDays: form.noticeDays
        ? Number(form.noticeDays)
        : undefined,
      onLeave: form.onLeave,

      transportVoucher: form.transportVoucher,
      lockerKey: form.lockerKey.trim() || undefined,
      lockerNumber: form.lockerNumber.trim() || undefined,
      observation: form.observation.trim() || undefined,

      dependents: dependents
        .filter((d) => d.name.trim())
        .map((d) => ({
          name: d.name.trim(),
          birthDate: d.birthDate || undefined,
          relationship: d.relationship || undefined,
        })),
    };

    try {
      if (editingId) {
        await employeeService.update(editingId, payload);
      } else {
        await employeeService.create(payload);
      }

      setFormOpen(false);

      await load();
    } catch (err) {
      setFormError(
        extractMessage(
          err,
          "Não foi possível salvar o colaborador."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: Employee) {
    if (
      !window.confirm(
        `Excluir o colaborador "${item.name}"?`
      )
    ) {
      return;
    }

    setActionError("");

    try {
      await employeeService.remove(item.id);

      await load();
    } catch (err) {
      setActionError(
        extractMessage(
          err,
          "Não foi possível excluir o colaborador."
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
                  Colaboradores
                </h1>

                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Cadastro completo de colaboradores: dados
                  pessoais, documentos, contrato, saúde
                  ocupacional, benefícios e dependentes.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/erp/rh/funcoes"
                  className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                >
                  <UserCog size={18} />
                  Funções e cargos
                </Link>

                <Can permission="employee.create">
                  <button
                    type="button"
                    onClick={openCreate}
                    className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)]"
                  >
                    <Plus size={18} />
                    Novo colaborador
                  </button>
                </Can>
              </div>
            </header>

            <div className="flex flex-wrap gap-3">
              <input
                placeholder="Buscar por nome, CPF ou e-mail..."
                className={`${fieldClass} max-w-80`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
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
              Nenhum colaborador cadastrado
            </p>

            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Use &quot;Novo colaborador&quot; para começar.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-[var(--surface-hover)] text-[var(--text-secondary)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">
                    Nome
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Função
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Setor
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Salário
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Admissão
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Status
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

                      {item.email && (
                        <p className="text-xs text-[var(--text-muted)]">
                          {item.email}
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-3 text-[var(--text-secondary)]">
                      {item.jobFunction?.name ?? "—"}
                    </td>

                    <td className="px-4 py-3 text-[var(--text-secondary)]">
                      {item.jobFunction?.sector?.name ?? "—"}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-right text-[var(--text-secondary)]">
                      {item.baseSalary
                        ? money(item.baseSalary)
                        : "—"}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-[var(--text-secondary)]">
                      {date(item.admissionDate)}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE_CLASS[item.status]}`}
                      >
                        {EMPLOYEE_STATUS_LABELS[item.status]}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Can permission="employee.update">
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

                        <Can permission="employee.delete">
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

      {/* Novo/editar colaborador */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-8 w-full max-w-5xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                {editingId
                  ? "Editar colaborador"
                  : "Novo colaborador"}
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

            <div className="mb-5 flex flex-wrap gap-1 border-b border-[var(--border)]">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? "border-b-2 border-[var(--primary)] text-[var(--primary)]"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              {activeTab === "Pessoais" && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="sm:col-span-2 lg:col-span-2">
                    <label className={labelClass}>
                      Nome completo
                    </label>

                    <input
                      className={fieldClass}
                      value={form.name}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          name: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      Data de nascimento
                    </label>

                    <input
                      type="date"
                      className={fieldClass}
                      value={form.birthDate}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          birthDate: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Sexo</label>

                    <select
                      className={fieldClass}
                      value={form.gender}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          gender: e.target.value as
                            | Gender
                            | "",
                        })
                      }
                    >
                      <option value="">Selecione...</option>

                      {Object.entries(GENDER_LABELS).map(
                        ([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>
                      Nome do pai
                    </label>

                    <input
                      className={fieldClass}
                      value={form.fatherName}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          fatherName: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      Nome da mãe
                    </label>

                    <input
                      className={fieldClass}
                      value={form.motherName}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          motherName: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      Naturalidade (cidade)
                    </label>

                    <input
                      className={fieldClass}
                      value={form.birthCity}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          birthCity: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      UF de nascimento
                    </label>

                    <input
                      maxLength={2}
                      className={fieldClass}
                      value={form.birthState}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          birthState:
                            e.target.value.toUpperCase(),
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      Estado civil
                    </label>

                    <select
                      className={fieldClass}
                      value={form.maritalStatus}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          maritalStatus: e.target
                            .value as MaritalStatus | "",
                        })
                      }
                    >
                      <option value="">Selecione...</option>

                      {Object.entries(
                        MARITAL_STATUS_LABELS
                      ).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>
                      Escolaridade
                    </label>

                    <select
                      className={fieldClass}
                      value={form.educationLevel}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          educationLevel: e.target
                            .value as EducationLevel | "",
                        })
                      }
                    >
                      <option value="">Selecione...</option>

                      {Object.entries(
                        EDUCATION_LEVEL_LABELS
                      ).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {activeTab === "Documentos" && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className={labelClass}>CPF</label>

                    <input
                      inputMode="numeric"
                      placeholder="000.000.000-00"
                      className={fieldClass}
                      value={form.cpf}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          cpf: maskCPF(e.target.value),
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className={labelClass}>RG</label>

                    <input
                      className={fieldClass}
                      value={form.rg}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          rg: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      CTPS (carteira de trabalho)
                    </label>

                    <input
                      className={fieldClass}
                      value={form.workCard}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          workCard: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      Série da CTPS
                    </label>

                    <input
                      className={fieldClass}
                      value={form.workCardSeries}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          workCardSeries: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className={labelClass}>PIS</label>

                    <input
                      className={fieldClass}
                      value={form.pis}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          pis: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              )}

              {activeTab === "Contato" && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className={labelClass}>CEP</label>

                    <div className="relative">
                      <input
                        inputMode="numeric"
                        placeholder="00000-000"
                        className={fieldClass}
                        value={form.zipCode}
                        onChange={(e) => {
                          const masked = maskCEP(
                            e.target.value
                          );

                          setForm({
                            ...form,
                            zipCode: masked,
                          });

                          if (isValidCEPLength(masked)) {
                            void handleCepLookup(masked);
                          }
                        }}
                      />

                      {loadingCep && (
                        <Loader2
                          size={16}
                          className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[var(--text-muted)]"
                        />
                      )}
                    </div>
                  </div>

                  <div className="lg:col-span-2">
                    <label className={labelClass}>
                      Logradouro
                    </label>

                    <input
                      className={fieldClass}
                      value={form.street}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          street: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      Número
                    </label>

                    <input
                      className={fieldClass}
                      value={form.number}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          number: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      Bairro
                    </label>

                    <input
                      className={fieldClass}
                      value={form.district}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          district: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      Cidade
                    </label>

                    <input
                      className={fieldClass}
                      value={form.city}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          city: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className={labelClass}>UF</label>

                    <input
                      maxLength={2}
                      className={fieldClass}
                      value={form.state}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          state:
                            e.target.value.toUpperCase(),
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      Telefone fixo
                    </label>

                    <input
                      inputMode="numeric"
                      placeholder="(00) 0000-0000"
                      className={fieldClass}
                      value={form.phone}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          phone: maskPhone(e.target.value),
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      Celular
                    </label>

                    <input
                      inputMode="numeric"
                      placeholder="(00) 00000-0000"
                      className={fieldClass}
                      value={form.mobile}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          mobile: maskPhone(e.target.value),
                        })
                      }
                    />
                  </div>

                  <div className="lg:col-span-2">
                    <label className={labelClass}>
                      E-mail
                    </label>

                    <input
                      type="email"
                      className={fieldClass}
                      value={form.email}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          email: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              )}

              {activeTab === "Contratuais" && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="lg:col-span-2">
                    <label className={labelClass}>
                      Função
                    </label>

                    <SearchSelect<JobFunction>
                      displayLabel={form.jobFunctionLabel}
                      search={searchJobFunctions}
                      getId={(f) => f.id}
                      getLabel={(f) => f.name}
                      getSubLabel={(f) => f.sector?.name}
                      placeholder="Digite para buscar a função..."
                      onSelect={(f) =>
                        setForm({
                          ...form,
                          jobFunctionId: f?.id ?? "",
                          jobFunctionLabel: f?.name ?? "",
                          // Herda salário/tipo/horário da função
                          // como sugestão inicial, editável.
                          baseSalary:
                            f && !form.baseSalary
                              ? String(num(f.baseSalary))
                              : form.baseSalary,
                          salaryType:
                            f && !form.salaryType
                              ? (f.salaryType ?? "")
                              : form.salaryType,
                          workScheduleId:
                            f && !form.workScheduleId
                              ? (f.workScheduleId ?? "")
                              : form.workScheduleId,
                        })
                      }
                    />
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
                      Status
                    </label>

                    <select
                      className={fieldClass}
                      value={form.status}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          status: e.target
                            .value as EmployeeStatus,
                        })
                      }
                    >
                      {Object.entries(
                        EMPLOYEE_STATUS_LABELS
                      ).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>
                      Salário base (R$)
                    </label>

                    <input
                      inputMode="decimal"
                      placeholder="0,00"
                      className={fieldClass}
                      value={form.baseSalary}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          baseSalary: e.target.value,
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

                      {Object.entries(
                        SALARY_TYPE_LABELS
                      ).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>
                      Forma de pagamento
                    </label>

                    <select
                      className={fieldClass}
                      value={form.paymentMethod}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          paymentMethod: e.target
                            .value as PaymentMethod | "",
                        })
                      }
                    >
                      <option value="">Selecione...</option>

                      {Object.entries(
                        PAYMENT_METHOD_LABELS
                      ).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>
                      Data de admissão
                    </label>

                    <input
                      type="date"
                      className={fieldClass}
                      value={form.admissionDate}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          admissionDate: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      Vence experiência
                    </label>

                    <input
                      type="date"
                      className={fieldClass}
                      value={form.experienceEndDate}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          experienceEndDate:
                            e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      Previsão de término (contrato)
                    </label>

                    <input
                      type="date"
                      className={fieldClass}
                      value={form.contractEndDate}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          contractEndDate: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      Data de demissão
                    </label>

                    <input
                      type="date"
                      className={fieldClass}
                      value={form.terminationDate}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          terminationDate: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              )}

              {activeTab === "Saúde e benefícios" && (
                <div className="space-y-6">
                  <div>
                    <p className="mb-2 text-sm font-semibold text-[var(--text-primary)]">
                      Saúde ocupacional
                    </p>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <label className={labelClass}>
                          Data do exame
                        </label>

                        <input
                          type="date"
                          className={fieldClass}
                          value={form.examDate}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              examDate: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div>
                        <label className={labelClass}>
                          Próximo exame (periódico)
                        </label>

                        <input
                          type="date"
                          className={fieldClass}
                          value={form.nextExamDate}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              nextExamDate: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div>
                        <label className={labelClass}>
                          Dias de aviso
                        </label>

                        <input
                          type="number"
                          min={0}
                          className={fieldClass}
                          value={form.noticeDays}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              noticeDays: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div className="flex items-end gap-4 pb-2">
                        <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                          <input
                            type="checkbox"
                            checked={form.examCompleted}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                examCompleted:
                                  e.target.checked,
                              })
                            }
                          />
                          Exame concluído
                        </label>

                        <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                          <input
                            type="checkbox"
                            checked={form.onLeave}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                onLeave: e.target.checked,
                              })
                            }
                          />
                          Afastado
                        </label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-sm font-semibold text-[var(--text-primary)]">
                      Benefícios e armário
                    </p>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="flex items-end pb-2">
                        <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                          <input
                            type="checkbox"
                            checked={form.transportVoucher}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                transportVoucher:
                                  e.target.checked,
                              })
                            }
                          />
                          Vale transporte
                        </label>
                      </div>

                      <div>
                        <label className={labelClass}>
                          Chave do armário
                        </label>

                        <input
                          className={fieldClass}
                          value={form.lockerKey}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              lockerKey: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div>
                        <label className={labelClass}>
                          Nº do armário
                        </label>

                        <input
                          className={fieldClass}
                          value={form.lockerNumber}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              lockerNumber: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>
                      Observações
                    </label>

                    <input
                      className={fieldClass}
                      value={form.observation}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          observation: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              )}

              {activeTab === "EPI" && (
                <div className="rounded-xl border border-[var(--border)] p-4">
                  {!form.jobFunctionId ? (
                    <p className="text-sm text-[var(--text-muted)]">
                      Selecione a função do colaborador na aba
                      &quot;Contratuais&quot; para ver os EPIs
                      exigidos.
                    </p>
                  ) : (
                    <FunctionPpeSummary
                      jobFunctionId={form.jobFunctionId}
                    />
                  )}

                  <p className="mt-3 text-xs text-[var(--text-muted)]">
                    O controle de entrega de EPI (ficha
                    assinada, data, quantidade) será uma tela
                    própria em breve — por ora, isso só mostra
                    o que a função exige.
                  </p>
                </div>
              )}

              {activeTab === "Dependentes" && (
                <div className="space-y-2">
                  <div className="mb-2 flex items-center justify-between">
                    <label className={labelClass}>
                      Dependentes
                    </label>

                    <button
                      type="button"
                      onClick={addDependent}
                      className="flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                    >
                      <Plus size={14} />
                      Adicionar dependente
                    </button>
                  </div>

                  {dependents.length === 0 ? (
                    <p className="py-6 text-center text-sm text-[var(--text-muted)]">
                      Nenhum dependente adicionado.
                    </p>
                  ) : (
                    dependents.map((dep, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-12 items-center gap-2 rounded-xl border border-[var(--border)] p-2"
                      >
                        <input
                          placeholder="Nome"
                          className={`${fieldClass} col-span-5`}
                          value={dep.name}
                          onChange={(e) =>
                            updateDependent(index, {
                              name: e.target.value,
                            })
                          }
                        />

                        <input
                          type="date"
                          className={`${fieldClass} col-span-3`}
                          value={dep.birthDate ?? ""}
                          onChange={(e) =>
                            updateDependent(index, {
                              birthDate: e.target.value,
                            })
                          }
                        />

                        <select
                          className={`${fieldClass} col-span-3`}
                          value={dep.relationship ?? ""}
                          onChange={(e) =>
                            updateDependent(index, {
                              relationship: e.target
                                .value as DependentRelationship,
                            })
                          }
                        >
                          <option value="">
                            Parentesco...
                          </option>

                          {Object.entries(
                            DEPENDENT_RELATIONSHIP_LABELS
                          ).map(([value, label]) => (
                            <option
                              key={value}
                              value={value}
                            >
                              {label}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={() =>
                            removeDependent(index)
                          }
                          title="Remover dependente"
                          aria-label="Remover dependente"
                          className="col-span-1 flex justify-center py-2 text-[var(--text-secondary)] transition-colors hover:text-[var(--danger)]"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {formError && (
                <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                  {formError}
                </div>
              )}

              <div className="flex justify-end gap-3 border-t border-[var(--border)] pt-4">
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

/** Mostra os EPIs exigidos pela função escolhida (só leitura). */
function FunctionPpeSummary({
  jobFunctionId,
}: {
  jobFunctionId: string;
}) {
  const [jobFunction, setJobFunction] =
    useState<JobFunction | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    jobFunctionService
      .getById(jobFunctionId)
      .then(setJobFunction)
      .catch(() => setJobFunction(null))
      .finally(() => setLoading(false));
  }, [jobFunctionId]);

  if (loading) {
    return (
      <p className="text-sm text-[var(--text-muted)]">
        Carregando...
      </p>
    );
  }

  if (!jobFunction?.requiresPpe) {
    return (
      <p className="text-sm text-[var(--text-secondary)]">
        A função <strong>{jobFunction?.name}</strong> não
        exige uso de EPI.
      </p>
    );
  }

  return (
    <div>
      <p className="mb-2 text-sm text-[var(--text-secondary)]">
        A função <strong>{jobFunction.name}</strong> exige os
        seguintes EPIs:
      </p>

      <ul className="list-inside list-disc space-y-1 text-sm text-[var(--text-primary)]">
        {jobFunction.ppeTypes.map((ppe) => (
          <li key={ppe.id}>{ppe.name}</li>
        ))}
      </ul>
    </div>
  );
}
