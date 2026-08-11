import { api } from "./api";
import type { PaymentMethod } from "./financial-entry.service";

interface ApiEnvelope<T> {
  success: boolean;
  timestamp: string;
  data: T;
}

interface Paged<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface AuxiliaryRecord {
  id: string;
  name: string;
  description?: string | null;
  active: boolean;
  [key: string]: unknown;
}

/**
 * Setores, horários e tipos de EPI têm o mesmo formato de API —
 * mesma fábrica usada em categorias/marcas/unidades de produto
 * (ver `product.service.ts`).
 */
function createAuxiliaryService<T>(resource: string) {
  return {
    async list(search?: string): Promise<Paged<T>> {
      const { data } = await api.get<ApiEnvelope<Paged<T>>>(
        `/${resource}`,
        { params: { search, limit: 100 } }
      );

      return data.data;
    },

    async create(payload: Record<string, unknown>) {
      const { data } = await api.post<ApiEnvelope<T>>(
        `/${resource}`,
        payload
      );

      return data.data;
    },

    async update(
      id: string,
      payload: Record<string, unknown>
    ) {
      const { data } = await api.patch<ApiEnvelope<T>>(
        `/${resource}/${id}`,
        payload
      );

      return data.data;
    },

    async remove(id: string) {
      await api.delete(`/${resource}/${id}`);
    },
  };
}

export const sectorService =
  createAuxiliaryService<AuxiliaryRecord>("sectors");

export const workScheduleService =
  createAuxiliaryService<AuxiliaryRecord>("work-schedules");

export const ppeTypeService =
  createAuxiliaryService<AuxiliaryRecord>("ppe-types");

export interface Benefit extends AuxiliaryRecord {
  calculationType: BenefitCalculationType;
}

export const benefitService =
  createAuxiliaryService<Benefit>("benefits");

export interface CboOccupation {
  code: string;
  title: string;
}

export const cboService = {
  async list(search?: string): Promise<CboOccupation[]> {
    const { data } = await api.get<
      ApiEnvelope<CboOccupation[]>
    >("/cbo", { params: { search, limit: 20 } });

    return data.data ?? [];
  },
};

export type SalaryType =
  | "MENSALISTA"
  | "HORISTA"
  | "DIARISTA"
  | "COMISSIONADO"
  | "OUTRO";

export const SALARY_TYPE_LABELS: Record<SalaryType, string> = {
  MENSALISTA: "Mensalista",
  HORISTA: "Horista",
  DIARISTA: "Diarista",
  COMISSIONADO: "Comissionado",
  OUTRO: "Outro",
};

export interface JobFunction {
  id: string;
  name: string;
  description?: string | null;
  cboCode?: string | null;
  cboTitle?: string | null;
  sectorId?: string | null;
  baseSalary?: string | number | null;
  salaryType?: SalaryType | null;
  workScheduleId?: string | null;
  requiresPpe: boolean;
  active: boolean;
  createdAt: string;

  sector?: AuxiliaryRecord | null;
  workSchedule?: AuxiliaryRecord | null;
  ppeTypes: AuxiliaryRecord[];
}

export interface JobFunctionPayload {
  name: string;
  description?: string;
  cboCode?: string;
  sectorId?: string;
  baseSalary?: number;
  salaryType?: SalaryType;
  workScheduleId?: string;
  requiresPpe?: boolean;
  ppeTypeIds?: string[];
}

export interface JobFunctionFilter {
  search?: string;
  sectorId?: string;
  limit?: number;
}

export const jobFunctionService = {
  async list(
    filter: JobFunctionFilter = {}
  ): Promise<JobFunction[]> {
    const { data } = await api.get<
      ApiEnvelope<Paged<JobFunction>>
    >("/job-functions", {
      params: { ...filter, limit: filter.limit ?? 100 },
    });

    return data.data.data ?? [];
  },

  async getById(id: string): Promise<JobFunction> {
    const { data } = await api.get<ApiEnvelope<JobFunction>>(
      `/job-functions/${id}`
    );

    return data.data;
  },

  async create(
    payload: JobFunctionPayload
  ): Promise<JobFunction> {
    const { data } = await api.post<ApiEnvelope<JobFunction>>(
      "/job-functions",
      payload
    );

    return data.data;
  },

  async update(
    id: string,
    payload: Partial<JobFunctionPayload>
  ): Promise<JobFunction> {
    const { data } = await api.patch<ApiEnvelope<JobFunction>>(
      `/job-functions/${id}`,
      payload
    );

    return data.data;
  },

  async remove(id: string) {
    await api.delete(`/job-functions/${id}`);
  },
};

// ============================================================
// Colaboradores
// ============================================================

export type Gender = "MASCULINO" | "FEMININO" | "OUTRO";

export const GENDER_LABELS: Record<Gender, string> = {
  MASCULINO: "Masculino",
  FEMININO: "Feminino",
  OUTRO: "Outro",
};

export type MaritalStatus =
  | "SOLTEIRO"
  | "CASADO"
  | "DIVORCIADO"
  | "VIUVO"
  | "UNIAO_ESTAVEL"
  | "OUTRO";

export const MARITAL_STATUS_LABELS: Record<
  MaritalStatus,
  string
> = {
  SOLTEIRO: "Solteiro(a)",
  CASADO: "Casado(a)",
  DIVORCIADO: "Divorciado(a)",
  VIUVO: "Viúvo(a)",
  UNIAO_ESTAVEL: "União estável",
  OUTRO: "Outro",
};

export type EducationLevel =
  | "FUNDAMENTAL_INCOMPLETO"
  | "FUNDAMENTAL_COMPLETO"
  | "MEDIO_INCOMPLETO"
  | "MEDIO_COMPLETO"
  | "SUPERIOR_INCOMPLETO"
  | "SUPERIOR_COMPLETO"
  | "POS_GRADUACAO"
  | "MESTRADO"
  | "DOUTORADO";

export const EDUCATION_LEVEL_LABELS: Record<
  EducationLevel,
  string
> = {
  FUNDAMENTAL_INCOMPLETO: "Fundamental incompleto",
  FUNDAMENTAL_COMPLETO: "Fundamental completo",
  MEDIO_INCOMPLETO: "Médio incompleto",
  MEDIO_COMPLETO: "Médio completo",
  SUPERIOR_INCOMPLETO: "Superior incompleto",
  SUPERIOR_COMPLETO: "Superior completo",
  POS_GRADUACAO: "Pós-graduação",
  MESTRADO: "Mestrado",
  DOUTORADO: "Doutorado",
};

export type EmployeeStatus =
  | "EXPERIENCIA"
  | "ATIVO"
  | "AFASTADO"
  | "DEMITIDO";

export const EMPLOYEE_STATUS_LABELS: Record<
  EmployeeStatus,
  string
> = {
  EXPERIENCIA: "Experiência",
  ATIVO: "Ativo",
  AFASTADO: "Afastado",
  DEMITIDO: "Demitido",
};

export type BankAccountType = "CORRENTE" | "POUPANCA";

export const BANK_ACCOUNT_TYPE_LABELS: Record<
  BankAccountType,
  string
> = {
  CORRENTE: "Conta corrente",
  POUPANCA: "Conta poupança",
};

export type PixKeyType =
  | "CPF"
  | "CNPJ"
  | "EMAIL"
  | "TELEFONE"
  | "ALEATORIA";

export const PIX_KEY_TYPE_LABELS: Record<PixKeyType, string> = {
  CPF: "CPF",
  CNPJ: "CNPJ",
  EMAIL: "E-mail",
  TELEFONE: "Telefone",
  ALEATORIA: "Chave aleatória",
};

export type DependentRelationship =
  | "FILHO"
  | "CONJUGE"
  | "PAI"
  | "MAE"
  | "OUTRO";

export const DEPENDENT_RELATIONSHIP_LABELS: Record<
  DependentRelationship,
  string
> = {
  FILHO: "Filho(a)",
  CONJUGE: "Cônjuge",
  PAI: "Pai",
  MAE: "Mãe",
  OUTRO: "Outro",
};

export interface EmployeeDependent {
  id?: string;
  name: string;
  birthDate?: string | null;
  relationship?: DependentRelationship | null;
}

export interface EmployeeBenefit {
  benefitId: string;
  value?: string | number | null;
  percentage?: string | number | null;
  benefit?: {
    id: string;
    name: string;
    calculationType?: BenefitCalculationType;
  } | null;
}

export type BenefitCalculationType = "FIXED" | "PERCENTAGE";

export const BENEFIT_CALCULATION_TYPE_LABELS: Record<
  BenefitCalculationType,
  string
> = {
  FIXED: "Valor fixo",
  PERCENTAGE: "% do salário",
};

export interface Employee {
  id: string;
  name: string;
  fatherName?: string | null;
  motherName?: string | null;
  birthDate?: string | null;
  gender?: Gender | null;
  birthCity?: string | null;
  birthState?: string | null;
  maritalStatus?: MaritalStatus | null;
  educationLevel?: EducationLevel | null;

  cpf?: string | null;
  rg?: string | null;
  workCard?: string | null;
  workCardSeries?: string | null;
  pis?: string | null;

  zipCode?: string | null;
  street?: string | null;
  number?: string | null;
  district?: string | null;
  city?: string | null;
  state?: string | null;
  phone?: string | null;
  mobile?: string | null;
  email?: string | null;

  jobFunctionId?: string | null;
  workScheduleId?: string | null;
  baseSalary?: string | number | null;
  salaryType?: SalaryType | null;
  paymentMethod?: PaymentMethod | null;
  admissionDate?: string | null;
  experienceStageDays?: number | null;
  experienceEndDate?: string | null;
  contractEndDate?: string | null;
  terminationDate?: string | null;
  status: EmployeeStatus;

  bankName?: string | null;
  bankAgency?: string | null;
  bankAccount?: string | null;
  bankAccountType?: BankAccountType | null;
  pixKeyType?: PixKeyType | null;
  pixKey?: string | null;

  nextExamDate?: string | null;
  noticeDays?: number | null;
  examReminderDays?: number | null;
  onLeave: boolean;

  leaveStartDate?: string | null;
  leaveDays?: number | null;
  leaveEndDate?: string | null;

  vacationStartDate?: string | null;
  vacationDays?: number | null;
  vacationEndDate?: string | null;
  onVacation: boolean;

  lockerKey?: string | null;
  lockerNumber?: string | null;
  shoeSize?: string | null;
  shirtSize?: string | null;
  pantsSize?: string | null;
  observation?: string | null;

  active: boolean;
  createdAt: string;

  jobFunction?: JobFunction | null;
  workSchedule?: AuxiliaryRecord | null;
  dependents: EmployeeDependent[];
  employeeBenefits: EmployeeBenefit[];
}

export interface EmployeeExam {
  id: string;
  employeeId: string;
  examDate: string;
  nextExamDate: string;
  status: "NO_PRAZO" | "ATRASADO";
  createdAt: string;
}

export const EXAM_STATUS_LABELS: Record<
  EmployeeExam["status"],
  string
> = {
  NO_PRAZO: "No prazo",
  ATRASADO: "Atrasado",
};

export interface EmployeePayload {
  name: string;
  fatherName?: string;
  motherName?: string;
  birthDate?: string;
  gender?: Gender;
  birthCity?: string;
  birthState?: string;
  maritalStatus?: MaritalStatus;
  educationLevel?: EducationLevel;

  cpf?: string;
  rg?: string;
  workCard?: string;
  workCardSeries?: string;
  pis?: string;

  zipCode?: string;
  street?: string;
  number?: string;
  district?: string;
  city?: string;
  state?: string;
  phone?: string;
  mobile?: string;
  email?: string;

  jobFunctionId?: string;
  workScheduleId?: string;
  baseSalary?: number;
  salaryType?: SalaryType;
  paymentMethod?: PaymentMethod;
  admissionDate?: string;
  experienceStageDays?: number;
  experienceEndDate?: string;
  contractEndDate?: string;
  terminationDate?: string;
  status?: EmployeeStatus;

  bankName?: string;
  bankAgency?: string;
  bankAccount?: string;
  bankAccountType?: BankAccountType;
  pixKeyType?: PixKeyType;
  pixKey?: string;

  noticeDays?: number;
  examReminderDays?: number;
  onLeave?: boolean;

  leaveStartDate?: string;
  leaveDays?: number;
  leaveEndDate?: string;

  vacationStartDate?: string;
  vacationDays?: number;
  vacationEndDate?: string;
  onVacation?: boolean;

  lockerKey?: string;
  lockerNumber?: string;
  shoeSize?: string;
  shirtSize?: string;
  pantsSize?: string;
  observation?: string;

  dependents?: EmployeeDependent[];
  benefits?: {
    benefitId: string;
    value?: number;
    percentage?: number;
  }[];
}

export interface EmployeeFilter {
  search?: string;
  jobFunctionId?: string;
  status?: EmployeeStatus;
  limit?: number;
}

export const employeeService = {
  async list(
    filter: EmployeeFilter = {}
  ): Promise<Employee[]> {
    const { data } = await api.get<
      ApiEnvelope<Paged<Employee>>
    >("/employees", {
      params: { ...filter, limit: filter.limit ?? 100 },
    });

    return data.data.data ?? [];
  },

  async getById(id: string): Promise<Employee> {
    const { data } = await api.get<ApiEnvelope<Employee>>(
      `/employees/${id}`
    );

    return data.data;
  },

  async create(payload: EmployeePayload): Promise<Employee> {
    const { data } = await api.post<ApiEnvelope<Employee>>(
      "/employees",
      payload
    );

    return data.data;
  },

  async update(
    id: string,
    payload: Partial<EmployeePayload>
  ): Promise<Employee> {
    const { data } = await api.patch<ApiEnvelope<Employee>>(
      `/employees/${id}`,
      payload
    );

    return data.data;
  },

  async remove(id: string) {
    await api.delete(`/employees/${id}`);
  },
};

// ============================================================
// Relatórios de RH
// ============================================================

export interface EmployeeBirthday {
  id: string;
  name: string;
  day: number;
  birthDate: string;
  jobFunctionName?: string | null;
  sectorName?: string | null;
}

export interface EmployeeIndicatorGroup {
  count: number;
}

export interface EmployeeFunctionIndicator
  extends EmployeeIndicatorGroup {
  jobFunctionId: string | null;
  jobFunctionName: string;
  averageSalary: number;
}

export interface EmployeeSectorIndicator
  extends EmployeeIndicatorGroup {
  sectorId: string | null;
  sectorName: string;
}

export interface EmployeeStatusIndicator
  extends EmployeeIndicatorGroup {
  status: EmployeeStatus;
}

export interface EmployeeGenderIndicator
  extends EmployeeIndicatorGroup {
  gender: Gender | null;
}

export interface EmployeeIndicators {
  totalActive: number;
  averageSalary: number;
  byFunction: EmployeeFunctionIndicator[];
  bySector: EmployeeSectorIndicator[];
  byStatus: EmployeeStatusIndicator[];
  byGender: EmployeeGenderIndicator[];
}

export const employeeReportsService = {
  async getBirthdays(
    month?: number
  ): Promise<EmployeeBirthday[]> {
    const { data } = await api.get<
      ApiEnvelope<EmployeeBirthday[]>
    >("/employees/reports/birthdays", {
      params: { month },
    });

    return data.data ?? [];
  },

  async getIndicators(): Promise<EmployeeIndicators> {
    const { data } = await api.get<
      ApiEnvelope<EmployeeIndicators>
    >("/employees/reports/indicators");

    return data.data;
  },
};

// ============================================================
// Entrega de EPI (ficha de EPI)
// ============================================================

export interface PpeDelivery {
  id: string;
  employeeId: string;
  ppeTypeId: string;
  ca?: string | null;
  quantity: string | number;
  deliveryDate: string;
  observation?: string | null;
  createdAt: string;

  ppeType?: AuxiliaryRecord | null;

  employee?: {
    id: string;
    name: string;
    rg?: string | null;
    cpf?: string | null;
    workCard?: string | null;
    workCardSeries?: string | null;
    jobFunction?: {
      id: string;
      name: string;
      sector?: { id: string; name: string } | null;
    } | null;
  } | null;
}

export interface PpeDeliveryPayload {
  employeeId: string;
  ppeTypeId: string;
  ca?: string;
  quantity?: number;
  deliveryDate?: string;
  observation?: string;
}

export const ppeDeliveryService = {
  async list(employeeId?: string): Promise<PpeDelivery[]> {
    const { data } = await api.get<
      ApiEnvelope<PpeDelivery[]>
    >("/ppe-deliveries", {
      params: { employeeId, limit: 200 },
    });

    return data.data ?? [];
  },

  async create(
    payload: PpeDeliveryPayload
  ): Promise<PpeDelivery> {
    const { data } = await api.post<
      ApiEnvelope<PpeDelivery>
    >("/ppe-deliveries", payload);

    return data.data;
  },

  async remove(id: string) {
    await api.delete(`/ppe-deliveries/${id}`);
  },
};

export const employeeExamService = {
  async list(employeeId?: string): Promise<EmployeeExam[]> {
    const { data } = await api.get<
      ApiEnvelope<EmployeeExam[]>
    >("/employee-exams", {
      params: { employeeId, limit: 200 },
    });

    return data.data ?? [];
  },

  async create(payload: {
    employeeId: string;
    examDate: string;
  }): Promise<EmployeeExam> {
    const { data } = await api.post<ApiEnvelope<EmployeeExam>>(
      "/employee-exams",
      payload
    );

    return data.data;
  },

  async remove(id: string) {
    await api.delete(`/employee-exams/${id}`);
  },
};
