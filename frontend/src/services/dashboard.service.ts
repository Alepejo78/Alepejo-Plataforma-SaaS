import { api } from "./api";
import type { CashFlow } from "./financial-entry.service";
import type { EmployeeBirthday } from "./hr.service";

/** Uma fatia do gráfico de despesas por tipo. */
export interface DashboardAccountBreakdownRow {
  code: string | null;
  description: string;
  pago: number;
  emAberto: number;
  total: number;
}

export interface DashboardGenderRow {
  gender: "MASCULINO" | "FEMININO" | "OUTRO" | null;
  count: number;
}

export interface DashboardSectorRow {
  sectorId: string | null;
  sectorName: string;
  count: number;
}

interface ApiEnvelope<T> {
  success: boolean;
  timestamp: string;
  data: T;
}

export interface DashboardCompanySummary {
  id: string;
  tradeName: string;
  legalName: string;
}

export interface DashboardOverview {
  /** true = a conta administra um grupo com mais de uma empresa e os números abaixo são a soma de todas. */
  consolidated: boolean;
  /** Só preenchido quando `consolidated` — as empresas somadas. */
  companies: DashboardCompanySummary[];
  inventoryItems: number;
  cashFlow: CashFlow;
  despesasPorTipo: DashboardAccountBreakdownRow[];
  receitasPorTipo: DashboardAccountBreakdownRow[];
  /** false só se a própria consulta de RH falhar — sem módulo licenciado os números vêm 0 normalmente. */
  hrAvailable: boolean;
  employeesAtivos: number;
  employeesExperiencia: number;
  birthdaysMes: EmployeeBirthday[];
  examesAVencer: number;
  employeesByGender: DashboardGenderRow[];
  employeesBySector: DashboardSectorRow[];
}

export const dashboardService = {
  /**
   * Visão geral da página inicial. Quem administra um grupo com mais
   * de uma empresa (permissão `company.create`) recebe o resultado
   * somado de todas — o backend decide isso sozinho, ver
   * `DashboardService.getOverview`.
   */
  async getOverview(year: number): Promise<DashboardOverview> {
    const { data } = await api.get<ApiEnvelope<DashboardOverview>>(
      "/dashboard/overview",
      { params: { year } }
    );

    return data.data;
  },
};
