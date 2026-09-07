import { api } from "./api";
import type { ImportPreview } from "./product-import.service";

interface ApiEnvelope<T> {
  success: boolean;
  timestamp: string;
  data: T;
}

export interface EmployeeImportRowData {
  name: string;
  cpf?: string;
  rg?: string;
  pis?: string;
  birthDate?: string;
  gender?: "MASCULINO" | "FEMININO" | "OUTRO";
  maritalStatus?:
    | "SOLTEIRO"
    | "CASADO"
    | "DIVORCIADO"
    | "VIUVO"
    | "UNIAO_ESTAVEL"
    | "OUTRO";
  educationLevel?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  zipCode?: string;
  street?: string;
  number?: string;
  district?: string;
  city?: string;
  state?: string;
  jobFunctionId?: string;
  workScheduleId?: string;
  baseSalary?: number;
  salaryType?: "MENSALISTA" | "HORISTA" | "DIARISTA" | "COMISSIONADO" | "OUTRO";
  paymentMethod?: string;
  admissionDate?: string;
  status?: "EXPERIENCIA" | "ATIVO" | "AFASTADO" | "DEMITIDO";
  bankName?: string;
  bankAgency?: string;
  bankAccount?: string;
  bankAccountType?: "CORRENTE" | "POUPANCA";
  pixKeyType?: "CPF" | "CNPJ" | "EMAIL" | "TELEFONE" | "ALEATORIA";
  pixKey?: string;
  observation?: string;
  existingId?: string;
}

export const employeeImportService = {
  async parse(file: File): Promise<ImportPreview<EmployeeImportRowData>> {
    const formData = new FormData();
    formData.append("file", file);

    const { data } = await api.post<
      ApiEnvelope<ImportPreview<EmployeeImportRowData>>
    >("/employee-import/parse", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return data.data;
  },

  async confirm(
    rows: (EmployeeImportRowData & { action: "create" | "update" })[]
  ): Promise<{ created: number; updated: number }> {
    const { data } = await api.post<
      ApiEnvelope<{ created: number; updated: number }>
    >("/employee-import/confirm", { rows });

    return data.data;
  },
};
