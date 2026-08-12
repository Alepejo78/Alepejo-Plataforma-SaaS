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
import { CurrencyInput } from "@/components/ui/CurrencyInput";

import {
  BANK_ACCOUNT_TYPE_LABELS,
  DEPENDENT_RELATIONSHIP_LABELS,
  EDUCATION_LEVEL_LABELS,
  EMPLOYEE_STATUS_LABELS,
  EXAM_STATUS_LABELS,
  GENDER_LABELS,
  MARITAL_STATUS_LABELS,
  PIX_KEY_TYPE_LABELS,
  SALARY_TYPE_LABELS,
  benefitService,
  employeeExamService,
  employeeService,
  jobFunctionService,
  workScheduleService,
  type AuxiliaryRecord,
  type BankAccountType,
  type Benefit,
  type DependentRelationship,
  type EducationLevel,
  type Employee,
  type EmployeeDependent,
  type EmployeeExam,
  type EmployeeStatus,
  type Gender,
  type JobFunction,
  type MaritalStatus,
  type PixKeyType,
  type SalaryType,
} from "@/services/hr.service";

import {
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
} from "@/services/financial-entry.service";

import { lookupService } from "@/services/lookup.service";
import {
  userService,
  type SystemUser,
} from "@/services/user.service";
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

function addDays(dateStr: string, days: number) {
  if (!dateStr) {
    return "";
  }

  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);

  return d.toISOString().slice(0, 10);
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
  "Dados bancários",
  "Saúde",
  "Benefícios",
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
  baseSalary: number;
  salaryType: SalaryType | "";
  paymentMethod: PaymentMethod | "";
  admissionDate: string;
  experienceStageDays: number;
  experienceEndDate: string;
  contractEndDate: string;
  terminationDate: string;
  status: EmployeeStatus;
  badgeCode: string;
  userId: string;

  bankName: string;
  bankAgency: string;
  bankAccount: string;
  bankAccountType: BankAccountType | "";
  pixKeyType: PixKeyType | "";
  pixKey: string;

  nextExamDate: string;
  noticeDays: string;
  examReminderDays: string;
  onLeave: boolean;

  leaveStartDate: string;
  leaveDays: string;
  leaveEndDate: string;

  vacationStartDate: string;
  vacationDays: string;
  vacationEndDate: string;
  onVacation: boolean;

  benefitValues: Record<
    string,
    { checked: boolean; value: number; percentage: number }
  >;
  lockerKey: string;
  lockerNumber: string;
  shoeSize: string;
  shirtSize: string;
  pantsSize: string;
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
    baseSalary: 0,
    salaryType: "",
    paymentMethod: "",
    admissionDate: "",
    experienceStageDays: 30,
    experienceEndDate: "",
    contractEndDate: "",
    terminationDate: "",
    status: "EXPERIENCIA",
    badgeCode: "",
    userId: "",

    bankName: "",
    bankAgency: "",
    bankAccount: "",
    bankAccountType: "",
    pixKeyType: "",
    pixKey: "",

    nextExamDate: "",
    noticeDays: "",
    examReminderDays: "7",
    onLeave: false,

    leaveStartDate: "",
    leaveDays: "",
    leaveEndDate: "",

    vacationStartDate: "",
    vacationDays: "",
    vacationEndDate: "",
    onVacation: false,

    benefitValues: {},
    lockerKey: "",
    lockerNumber: "",
    shoeSize: "",
    shirtSize: "",
    pantsSize: "",
    observation: "",
  };
}

export default function ColaboradoresPage() {
  const [items, setItems] = useState<Employee[]>([]);
  const [schedules, setSchedules] = useState<AuxiliaryRecord[]>(
    []
  );
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>(
    []
  );
  const [benefitCatalog, setBenefitCatalog] = useState<
    Benefit[]
  >([]);

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
  const [cepError, setCepError] = useState("");

  const [examHistory, setExamHistory] = useState<
    EmployeeExam[]
  >([]);
  const [newExamDate, setNewExamDate] = useState("");
  const [examSaving, setExamSaving] = useState(false);
  const [examError, setExamError] = useState("");

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

    userService
      .list()
      .then(setSystemUsers)
      .catch(() => {});

    benefitService
      .list()
      .then((r) => setBenefitCatalog(r.data))
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

  async function loadExamHistory(employeeId: string) {
    try {
      const result = await employeeExamService.list(
        employeeId
      );

      setExamHistory(result);
    } catch {
      setExamHistory([]);
    }
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setDependents([]);
    setExamHistory([]);
    setNewExamDate("");
    setActiveTab("Pessoais");
    setFormError("");
    setCepError("");
    setFormOpen(true);
  }

  function openEdit(item: Employee) {
    setEditingId(item.id);
    setNewExamDate("");
    void loadExamHistory(item.id);
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
      baseSalary: num(item.baseSalary),
      salaryType: item.salaryType ?? "",
      paymentMethod: item.paymentMethod ?? "",
      admissionDate: toDateInput(item.admissionDate),
      experienceStageDays: item.experienceStageDays ?? 30,
      experienceEndDate: toDateInput(item.experienceEndDate),
      contractEndDate: toDateInput(item.contractEndDate),
      terminationDate: toDateInput(item.terminationDate),
      status: item.status,
      badgeCode: item.badgeCode ?? "",
      userId: item.userId ?? "",

      bankName: item.bankName ?? "",
      bankAgency: item.bankAgency ?? "",
      bankAccount: item.bankAccount ?? "",
      bankAccountType: item.bankAccountType ?? "",
      pixKeyType: item.pixKeyType ?? "",
      pixKey: item.pixKey ?? "",

      nextExamDate: toDateInput(item.nextExamDate),
      noticeDays:
        item.noticeDays != null ? String(item.noticeDays) : "",
      examReminderDays:
        item.examReminderDays != null
          ? String(item.examReminderDays)
          : "7",
      onLeave: item.onLeave,

      leaveStartDate: toDateInput(item.leaveStartDate),
      leaveDays:
        item.leaveDays != null ? String(item.leaveDays) : "",
      leaveEndDate: toDateInput(item.leaveEndDate),

      vacationStartDate: toDateInput(item.vacationStartDate),
      vacationDays:
        item.vacationDays != null
          ? String(item.vacationDays)
          : "",
      vacationEndDate: toDateInput(item.vacationEndDate),
      onVacation: item.onVacation,

      benefitValues: Object.fromEntries(
        item.employeeBenefits.map((eb) => [
          eb.benefitId,
          {
            checked: true,
            value: num(eb.value),
            percentage: num(eb.percentage),
          },
        ])
      ),
      lockerKey: item.lockerKey ?? "",
      lockerNumber: item.lockerNumber ?? "",
      shoeSize: item.shoeSize ?? "",
      shirtSize: item.shirtSize ?? "",
      pantsSize: item.pantsSize ?? "",
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
    setCepError("");
    setFormOpen(true);
  }

  async function handleCepLookup(value: string) {
    if (!isValidCEPLength(value)) {
      return;
    }

    setLoadingCep(true);
    setCepError("");

    try {
      const data = await lookupService.cep(value);

      setForm((prev) => ({
        ...prev,
        street: data.street ?? prev.street,
        district: data.district ?? prev.district,
        city: data.city ?? prev.city,
        state: data.state ?? prev.state,
      }));
    } catch (err) {
      setCepError(
        err instanceof Error
          ? err.message
          : "Não foi possível consultar o CEP."
      );
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
      baseSalary: form.baseSalary || undefined,
      salaryType: form.salaryType || undefined,
      paymentMethod: form.paymentMethod || undefined,
      admissionDate: form.admissionDate || undefined,
      experienceStageDays: form.experienceStageDays,
      experienceEndDate: form.experienceEndDate || undefined,
      contractEndDate: form.contractEndDate || undefined,
      terminationDate: form.terminationDate || undefined,
      status: form.status,
      badgeCode: form.badgeCode.trim() || undefined,
      userId: form.userId || undefined,

      bankName: form.bankName.trim() || undefined,
      bankAgency: form.bankAgency.trim() || undefined,
      bankAccount: form.bankAccount.trim() || undefined,
      bankAccountType: form.bankAccountType || undefined,
      pixKeyType: form.pixKeyType || undefined,
      pixKey: form.pixKey.trim() || undefined,

      noticeDays: form.noticeDays
        ? Number(form.noticeDays)
        : undefined,
      examReminderDays: form.examReminderDays
        ? Number(form.examReminderDays)
        : undefined,
      onLeave: form.onLeave,

      leaveStartDate: form.leaveStartDate || undefined,
      leaveDays: form.leaveDays
        ? Number(form.leaveDays)
        : undefined,
      leaveEndDate: form.leaveEndDate || undefined,

      vacationStartDate: form.vacationStartDate || undefined,
      vacationDays: form.vacationDays
        ? Number(form.vacationDays)
        : undefined,
      vacationEndDate: form.vacationEndDate || undefined,
      onVacation: form.onVacation,

      benefits: Object.entries(form.benefitValues)
        .filter(([, v]) => v.checked)
        .map(([benefitId, v]) => {
          const isPercentage =
            benefitCatalog.find((b) => b.id === benefitId)
              ?.calculationType === "PERCENTAGE";

          return {
            benefitId,
            value: isPercentage
              ? undefined
              : v.value || undefined,
            percentage: isPercentage
              ? v.percentage || undefined
              : undefined,
          };
        }),
      lockerKey: form.lockerKey.trim() || undefined,
      lockerNumber: form.lockerNumber.trim() || undefined,
      shoeSize: form.shoeSize.trim() || undefined,
      shirtSize: form.shirtSize.trim() || undefined,
      pantsSize: form.pantsSize.trim() || undefined,
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

  async function registerExam() {
    if (!editingId || !newExamDate) {
      return;
    }

    setExamSaving(true);
    setExamError("");

    try {
      const exam = await employeeExamService.create({
        employeeId: editingId,
        examDate: newExamDate,
      });

      setNewExamDate("");
      setForm((prev) => ({
        ...prev,
        nextExamDate: toDateInput(exam.nextExamDate),
      }));

      await loadExamHistory(editingId);
    } catch (err) {
      setExamError(
        extractMessage(
          err,
          "Não foi possível registrar o exame."
        )
      );
    } finally {
      setExamSaving(false);
    }
  }

  async function removeExam(exam: EmployeeExam) {
    if (!editingId) {
      return;
    }

    if (
      !window.confirm(
        `Remover o registro do exame de ${date(exam.examDate)}?`
      )
    ) {
      return;
    }

    try {
      await employeeExamService.remove(exam.id);

      await loadExamHistory(editingId);

      const updated = await employeeService.getById(
        editingId
      );

      setForm((prev) => ({
        ...prev,
        nextExamDate: toDateInput(updated.nextExamDate),
      }));
    } catch (err) {
      setExamError(
        extractMessage(
          err,
          "Não foi possível remover o exame."
        )
      );
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
                          setCepError("");

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

                    {cepError && (
                      <p className="mt-1 text-xs text-[var(--warning)]">
                        {cepError}
                      </p>
                    )}
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
                  <div>
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
                              ? num(f.baseSalary)
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

                    {form.workScheduleId && (
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        {schedules.find(
                          (s) => s.id === form.workScheduleId
                        )?.description ||
                          "Sem horário detalhado cadastrado."}
                      </p>
                    )}
                  </div>

                  <div className="mx-auto w-40">
                    <label className={labelClass}>
                      Código para bater ponto
                    </label>

                    <input
                      className={fieldClass}
                      placeholder="Ex.: 0042"
                      value={form.badgeCode}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          badgeCode: e.target.value,
                        })
                      }
                    />

                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      O que vai no crachá/QR Code pra registrar ponto
                      (módulo Ponto). Sem preencher, dá pra usar o id
                      do colaborador direto.
                    </p>
                  </div>

                  <div className="mx-auto w-40">
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

                  <div className="mx-auto w-56">
                    <label className={labelClass}>
                      Usuário do sistema
                    </label>

                    <select
                      className={fieldClass}
                      value={form.userId}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          userId: e.target.value,
                        })
                      }
                    >
                      <option value="">
                        Nenhum (sem login vinculado)
                      </option>

                      {systemUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} — {u.email}
                        </option>
                      ))}
                    </select>

                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      Pra telas de autoatendimento (ex.: Ponto -
                      Manual) saberem qual colaborador é o usuário
                      logado.
                    </p>
                  </div>

                  <div>
                    <label className={labelClass}>
                      Estágio de experiência
                    </label>

                    <div className="flex h-11 items-center gap-3">
                      {[30, 60, 90].map((stage) => (
                        <label
                          key={stage}
                          className="flex items-center gap-1.5 text-sm text-[var(--text-primary)] cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={
                              form.experienceStageDays === stage
                            }
                            onChange={() =>
                              setForm({
                                ...form,
                                experienceStageDays: stage,
                                experienceEndDate: addDays(
                                  form.admissionDate,
                                  stage
                                ),
                              })
                            }
                            className="h-4 w-4 rounded border-[var(--border)] accent-[var(--primary)]"
                          />
                          {stage} dias
                        </label>
                      ))}
                    </div>

                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      Avança sozinho (30→60→90) e efetiva após
                      90 dias, se não mexer.
                    </p>
                  </div>

                  <div className="mx-auto w-40">
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

                      {Object.entries(
                        SALARY_TYPE_LABELS
                      ).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mx-auto w-44">
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

                  <div className="mx-auto w-40">
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
                          experienceEndDate: addDays(
                            e.target.value,
                            form.experienceStageDays
                          ),
                        })
                      }
                    />
                  </div>

                  <div className="mx-auto w-40">
                    <label className={labelClass}>
                      Vence experiência
                    </label>

                    <input
                      type="date"
                      disabled
                      className={`${fieldClass} opacity-70`}
                      value={form.experienceEndDate}
                      readOnly
                    />

                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      Calculado — admissão + estágio.
                    </p>
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

                  <div className="mx-auto w-40">
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
                          status: e.target.value
                            ? "DEMITIDO"
                            : form.status,
                        })
                      }
                    />
                  </div>
                </div>
              )}

              {activeTab === "Dados bancários" && (
                <div className="space-y-4">
                  <p className="text-xs text-[var(--text-muted)]">
                    Usados para pagamento de salário por
                    transferência ou Pix.
                  </p>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="lg:col-span-2">
                      <label className={labelClass}>
                        Banco
                      </label>

                      <input
                        className={fieldClass}
                        value={form.bankName}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            bankName: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div>
                      <label className={labelClass}>
                        Agência
                      </label>

                      <input
                        className={fieldClass}
                        value={form.bankAgency}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            bankAgency: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div>
                      <label className={labelClass}>
                        Conta
                      </label>

                      <input
                        className={fieldClass}
                        value={form.bankAccount}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            bankAccount: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div>
                      <label className={labelClass}>
                        Tipo de conta
                      </label>

                      <select
                        className={fieldClass}
                        value={form.bankAccountType}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            bankAccountType: e.target
                              .value as BankAccountType | "",
                          })
                        }
                      >
                        <option value="">Selecione...</option>

                        {Object.entries(
                          BANK_ACCOUNT_TYPE_LABELS
                        ).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={labelClass}>
                        Tipo de chave Pix
                      </label>

                      <select
                        className={fieldClass}
                        value={form.pixKeyType}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            pixKeyType: e.target
                              .value as PixKeyType | "",
                          })
                        }
                      >
                        <option value="">Selecione...</option>

                        {Object.entries(
                          PIX_KEY_TYPE_LABELS
                        ).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="lg:col-span-2">
                      <label className={labelClass}>
                        Chave Pix
                      </label>

                      <input
                        className={fieldClass}
                        value={form.pixKey}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            pixKey: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "Saúde" && (
                <div className="space-y-6">
                  <div>
                    <p className="mb-2 text-sm font-semibold text-[var(--text-primary)]">
                      Saúde ocupacional
                    </p>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <label className={labelClass}>
                          Próximo exame pendente
                        </label>

                        <input
                          type="date"
                          disabled
                          readOnly
                          className={`${fieldClass} opacity-70`}
                          value={form.nextExamDate}
                        />

                        <p className="mt-1 text-xs text-[var(--text-muted)]">
                          {form.nextExamDate
                            ? "Calculado a partir do último exame registrado."
                            : "Sem exame registrado ainda — a referência é a data de admissão."}
                        </p>
                      </div>

                      <div>
                        <label className={labelClass}>
                          Avisar exame com quantos dias
                        </label>

                        <input
                          type="number"
                          min={0}
                          className={fieldClass}
                          value={form.examReminderDays}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              examReminderDays: e.target.value,
                            })
                          }
                        />

                        <p className="mt-1 text-xs text-[var(--text-muted)]">
                          Recebe também aviso fixo 3 dias antes e no
                          dia do exame, por e-mail/WhatsApp.
                        </p>
                      </div>

                      <div>
                        <label className={labelClass}>
                          Dias de aviso (afastamento)
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
                              onLeave: Number(
                                e.target.value
                              )
                                ? true
                                : form.onLeave,
                            })
                          }
                        />
                      </div>

                      <div className="lg:border-l lg:border-[var(--border)] lg:pl-4">
                        <label className={labelClass}>
                          Início do afastamento
                        </label>

                        <input
                          type="date"
                          className={fieldClass}
                          value={form.leaveStartDate}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              leaveStartDate: e.target.value,
                              leaveEndDate: e.target.value
                                ? addDays(
                                    e.target.value,
                                    Number(form.leaveDays) || 0
                                  )
                                : "",
                              onLeave: e.target.value
                                ? true
                                : form.onLeave,
                            })
                          }
                        />
                      </div>

                      <div>
                        <label className={labelClass}>
                          Dias afastado
                        </label>

                        <input
                          type="number"
                          min={0}
                          className={fieldClass}
                          value={form.leaveDays}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              leaveDays: e.target.value,
                              leaveEndDate: form.leaveStartDate
                                ? addDays(
                                    form.leaveStartDate,
                                    Number(e.target.value) || 0
                                  )
                                : "",
                            })
                          }
                        />
                      </div>

                      <div>
                        <label className={labelClass}>
                          Fim do afastamento
                        </label>

                        <input
                          type="date"
                          disabled
                          readOnly
                          className={`${fieldClass} opacity-70`}
                          value={form.leaveEndDate}
                        />

                        <p className="mt-1 text-xs text-[var(--text-muted)]">
                          Calculado — início + dias.
                        </p>
                      </div>

                      <div className="flex items-end pb-2">
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

                  <div className="border-t border-[var(--border)] pt-6">
                    <p className="mb-2 text-sm font-semibold text-[var(--text-primary)]">
                      Férias
                    </p>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <label className={labelClass}>
                          Início das férias
                        </label>

                        <input
                          type="date"
                          className={fieldClass}
                          value={form.vacationStartDate}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              vacationStartDate: e.target.value,
                              vacationEndDate: e.target.value
                                ? addDays(
                                    e.target.value,
                                    Number(form.vacationDays) ||
                                      0
                                  )
                                : "",
                              onVacation: e.target.value
                                ? true
                                : form.onVacation,
                            })
                          }
                        />
                      </div>

                      <div>
                        <label className={labelClass}>
                          Dias de férias
                        </label>

                        <input
                          type="number"
                          min={0}
                          className={fieldClass}
                          value={form.vacationDays}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              vacationDays: e.target.value,
                              vacationEndDate:
                                form.vacationStartDate
                                  ? addDays(
                                      form.vacationStartDate,
                                      Number(e.target.value) ||
                                        0
                                    )
                                  : "",
                            })
                          }
                        />
                      </div>

                      <div>
                        <label className={labelClass}>
                          Fim das férias
                        </label>

                        <input
                          type="date"
                          disabled
                          readOnly
                          className={`${fieldClass} opacity-70`}
                          value={form.vacationEndDate}
                        />

                        <p className="mt-1 text-xs text-[var(--text-muted)]">
                          Calculado — início + dias.
                        </p>
                      </div>

                      <div className="flex items-end pb-2">
                        <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                          <input
                            type="checkbox"
                            checked={form.onVacation}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                onVacation: e.target.checked,
                              })
                            }
                          />
                          Em férias
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-[var(--border)] pt-6">
                    <p className="mb-2 text-sm font-semibold text-[var(--text-primary)]">
                      Registrar exame realizado
                    </p>

                    {!editingId ? (
                      <p className="text-sm text-[var(--text-muted)]">
                        Salve o cadastro primeiro para
                        registrar exames.
                      </p>
                    ) : (
                      <>
                        <div className="flex flex-wrap items-end gap-3">
                          <div>
                            <label className={labelClass}>
                              Data do exame
                            </label>

                            <input
                              type="date"
                              className={fieldClass}
                              value={newExamDate}
                              onChange={(e) =>
                                setNewExamDate(
                                  e.target.value
                                )
                              }
                            />
                          </div>

                          <button
                            type="button"
                            disabled={
                              examSaving || !newExamDate
                            }
                            onClick={() =>
                              void registerExam()
                            }
                            className="h-11 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--primary-contrast)] disabled:opacity-60"
                          >
                            {examSaving
                              ? "Registrando..."
                              : "Registrar"}
                          </button>
                        </div>

                        <p className="mt-1 text-xs text-[var(--text-muted)]">
                          Ao registrar, o próximo exame é
                          calculado automaticamente para 1 ano
                          depois, em dia útil.
                        </p>

                        {examError && (
                          <div className="mt-2 rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                            {examError}
                          </div>
                        )}

                        {examHistory.length > 0 && (
                          <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--border)]">
                            <table className="w-full text-left text-sm">
                              <thead className="bg-[var(--surface-hover)] text-[var(--text-secondary)]">
                                <tr>
                                  <th className="px-4 py-2 font-semibold">
                                    Data do exame
                                  </th>
                                  <th className="px-4 py-2 font-semibold">
                                    Próximo exame
                                  </th>
                                  <th className="px-4 py-2 font-semibold">
                                    Status
                                  </th>
                                  <th className="px-4 py-2" />
                                </tr>
                              </thead>
                              <tbody>
                                {examHistory.map((exam) => (
                                  <tr
                                    key={exam.id}
                                    className="border-t border-[var(--border)]"
                                  >
                                    <td className="px-4 py-2 text-[var(--text-primary)]">
                                      {date(exam.examDate)}
                                    </td>
                                    <td className="px-4 py-2 text-[var(--text-secondary)]">
                                      {date(
                                        exam.nextExamDate
                                      )}
                                    </td>
                                    <td
                                      className={`px-4 py-2 font-medium ${
                                        exam.status ===
                                        "ATRASADO"
                                          ? "text-[var(--danger)]"
                                          : "text-[var(--success)]"
                                      }`}
                                    >
                                      {
                                        EXAM_STATUS_LABELS[
                                          exam.status
                                        ]
                                      }
                                    </td>
                                    <td className="px-4 py-2">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          void removeExam(
                                            exam
                                          )
                                        }
                                        title="Remover"
                                        aria-label="Remover"
                                        className="rounded-lg border border-[var(--border)] p-1.5 text-[var(--text-secondary)] transition-colors hover:border-[var(--danger)] hover:text-[var(--danger)]"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </>
                    )}
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

              {activeTab === "Benefícios" && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      Benefícios
                    </p>

                    <Link
                      href="/erp/rh/cadastros"
                      className="text-xs font-medium text-[var(--primary)] hover:underline"
                    >
                      Manutenção de benefícios
                    </Link>
                  </div>

                  {benefitCatalog.length === 0 ? (
                    <p className="text-sm text-[var(--text-muted)]">
                      Nenhum benefício cadastrado.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {benefitCatalog.map((b) => {
                        const current = form.benefitValues[
                          b.id
                        ] ?? {
                          checked: false,
                          value: 0,
                          percentage: 0,
                        };
                        const isPercentage =
                          b.calculationType === "PERCENTAGE";
                        const computed =
                          (form.baseSalary *
                            current.percentage) /
                          100;

                        return (
                          <div
                            key={b.id}
                            className="grid grid-cols-1 items-center gap-3 rounded-xl border border-[var(--border)] p-3 sm:grid-cols-3"
                          >
                            <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                              <input
                                type="checkbox"
                                checked={current.checked}
                                onChange={(e) =>
                                  setForm({
                                    ...form,
                                    benefitValues: {
                                      ...form.benefitValues,
                                      [b.id]: {
                                        ...current,
                                        checked:
                                          e.target.checked,
                                      },
                                    },
                                  })
                                }
                              />
                              {b.name}
                            </label>

                            {isPercentage ? (
                              <div className="sm:col-span-2">
                                <div className="flex items-center gap-3">
                                  <input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    disabled={
                                      !current.checked
                                    }
                                    className={`${fieldClass} text-center`}
                                    style={{ width: "4.5rem" }}
                                    value={
                                      current.percentage || ""
                                    }
                                    onChange={(e) =>
                                      setForm({
                                        ...form,
                                        benefitValues: {
                                          ...form.benefitValues,
                                          [b.id]: {
                                            ...current,
                                            checked: true,
                                            percentage: Number(
                                              e.target.value
                                            ),
                                          },
                                        },
                                      })
                                    }
                                  />
                                  <span className="text-sm text-[var(--text-secondary)]">
                                    % do salário
                                  </span>
                                  {current.checked && (
                                    <span className="text-sm font-semibold text-[var(--text-primary)]">
                                      ={" "}
                                      {computed.toLocaleString(
                                        "pt-BR",
                                        {
                                          style: "currency",
                                          currency: "BRL",
                                        }
                                      )}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="sm:col-span-2">
                                <CurrencyInput
                                  className={fieldClass}
                                  value={current.value}
                                  disabled={!current.checked}
                                  onChange={(value) =>
                                    setForm({
                                      ...form,
                                      benefitValues: {
                                        ...form.benefitValues,
                                        [b.id]: {
                                          ...current,
                                          checked: true,
                                          value,
                                        },
                                      },
                                    })
                                  }
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "EPI" && (
                <div className="space-y-6">
                  <div>
                    <p className="mb-2 text-sm font-semibold text-[var(--text-primary)]">
                      Armário
                    </p>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                    <p className="mb-2 text-sm font-semibold text-[var(--text-primary)]">
                      Tamanhos
                    </p>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <label className={labelClass}>
                          Calçado
                        </label>

                        <input
                          placeholder="Ex.: 40"
                          className={fieldClass}
                          value={form.shoeSize}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              shoeSize: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div>
                        <label className={labelClass}>
                          Camisa
                        </label>

                        <input
                          placeholder="Ex.: M"
                          className={fieldClass}
                          value={form.shirtSize}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              shirtSize: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div>
                        <label className={labelClass}>
                          Calça
                        </label>

                        <input
                          placeholder="Ex.: 42"
                          className={fieldClass}
                          value={form.pantsSize}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              pantsSize: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-[var(--border)] pt-6">
                    <p className="mb-2 text-sm font-semibold text-[var(--text-primary)]">
                      EPIs exigidos pela função
                    </p>

                    <div className="rounded-xl border border-[var(--border)] p-4">
                      {!form.jobFunctionId ? (
                        <p className="text-sm text-[var(--text-muted)]">
                          Selecione a função do colaborador na
                          aba &quot;Contratuais&quot; para ver
                          os EPIs exigidos.
                        </p>
                      ) : (
                        <FunctionPpeSummary
                          jobFunctionId={form.jobFunctionId}
                        />
                      )}

                      <p className="mt-3 text-xs text-[var(--text-muted)]">
                        O controle de entrega de EPI (ficha
                        assinada, data, quantidade) fica na
                        tela própria de Ficha de EPI — por ora,
                        isso só mostra o que a função exige.
                      </p>
                    </div>
                  </div>
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
