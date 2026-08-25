import { Injectable } from '@nestjs/common';
import { FinancialEntryType } from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';
import { CompanyService } from '../../identity/company/services/company.service';
import { FinancialEntriesService } from '../../financial-entries/services/financial-entries.service';
import { EmployeesService } from '../../employees/services/employees.service';
import {
  AuthenticatedPermission,
  AuthenticatedUser,
  PermissionEffect,
} from '../../identity/auth/interfaces/authenticated-user.interface';

/** Empresa de menor porte, só o que a tela precisa pra rotular o quê é o quê. */
export interface DashboardCompanySummary {
  id: string;
  tradeName: string;
  legalName: string;
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly companyService: CompanyService,
    private readonly financialEntriesService: FinancialEntriesService,
    private readonly employeesService: EmployeesService,
  ) {}

  /**
   * Mesma regra de precedência do `PermissionsGuard`: DENY sempre
   * vence, mesmo vindo de outro perfil. Replicada aqui porque essa
   * checagem acontece dentro do service (decide o QUE consultar), não
   * como porta de entrada de uma rota — não dá pra usar o decorator
   * `@Permissions`.
   */
  private hasPermission(
    user: AuthenticatedUser,
    code: string,
  ): boolean {
    const entries: AuthenticatedPermission[] = Array.isArray(
      user.permissions,
    )
      ? user.permissions.filter((p) => p.code === code)
      : [];

    if (entries.length === 0) {
      return false;
    }

    return !entries.some((p) => p.effect === PermissionEffect.DENY);
  }

  /**
   * Visão geral da página inicial. Quem administra o grupo (permissão
   * `company.create` — a mesma que libera "Cadastrar empresa" em
   * Configurações → Empresa) e está num grupo com mais de uma empresa
   * vê o resultado somado de todas; qualquer outra pessoa — inclusive
   * um administrador de uma empresa avulsa, sem filiais — vê só a
   * própria empresa, que é o que ela consegue mesmo enxergar no dia a
   * dia dela.
   */
  async getOverview(user: AuthenticatedUser, year: number) {
    const group = await this.companyService.getGroup(
      user.companyId,
    );

    const isGroupAdmin = this.hasPermission(user, 'company.create');
    const consolidated = isGroupAdmin && group.length > 1;

    const companyIds = consolidated
      ? group.map((c) => c.id)
      : [user.companyId];

    const [cashFlow, despesasPorTipo, inventoryItems, hr] =
      await Promise.all([
        this.financialEntriesService.getCashFlow(
          consolidated ? companyIds : user.companyId,
          year,
        ),
        this.financialEntriesService.getAccountBreakdown(
          consolidated ? companyIds : user.companyId,
          year,
          FinancialEntryType.PAYABLE,
        ),
        this.prisma.inventory.count({
          where: { companyId: { in: companyIds } },
        }),
        this.getHrSummary(user),
      ]);

    const companies: DashboardCompanySummary[] = consolidated
      ? group.map((c) => ({
          id: c.id,
          tradeName: c.tradeName || c.legalName,
          legalName: c.legalName,
        }))
      : [];

    return {
      consolidated,
      companies,
      inventoryItems,
      cashFlow,
      despesasPorTipo,
      hrAvailable: hr.available,
      employeesAtivos: hr.ativos,
      employeesExperiencia: hr.experiencia,
      birthdaysMes: hr.birthdays,
      examesAVencer: hr.exames,
      employeesByGender: hr.byGender,
      employeesBySector: hr.bySector,
    };
  }

  /**
   * RH não é módulo obrigatório. Os métodos chamados aqui rodam fora
   * do pipeline HTTP (chamada direta ao service, sem passar pelo
   * `LicenseGuard`), então uma empresa sem o módulo não dá erro — só
   * não tem colaborador nenhum cadastrado. `available: false` só
   * entra em cena se a própria consulta falhar de verdade (banco fora,
   * por exemplo); nesse caso o cartão de RH volta a mostrar "—" na
   * tela, igual ao comportamento de antes desta consolidação.
   *
   * Colaborador é cadastro "Interprise" (ver `rootCompanyId` no schema)
   * — diferente do cash flow/estoque (que só somam entre empresas pra
   * quem administra o grupo), aqui é sempre visão geral do grupo,
   * pra qualquer pessoa, senão colaborador cadastrado numa empresa do
   * grupo some do cartão de quem está logado na raiz (e vice-versa).
   */
  private async getHrSummary(user: AuthenticatedUser) {
    try {
      const [indicators, birthdays, employees] = await Promise.all([
        this.employeesService.getIndicatorsInGroup(
          user.rootCompanyId,
        ),
        this.employeesService.getBirthdaysInGroup(
          user.rootCompanyId,
        ),
        this.employeesService.findAllInGroup(
          user.rootCompanyId,
          { page: 1, limit: 100, orderBy: 'name', order: 'asc' },
        ),
      ]);

      const daqui30Dias = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000,
      );

      const exames = employees.data.filter(
        (e) =>
          e.nextExamDate && new Date(e.nextExamDate) <= daqui30Dias,
      ).length;

      return {
        available: true,
        ativos:
          indicators.byStatus.find((s) => s.status === 'ATIVO')
            ?.count ?? 0,
        experiencia:
          indicators.byStatus.find(
            (s) => s.status === 'EXPERIENCIA',
          )?.count ?? 0,
        birthdays,
        exames,
        byGender: indicators.byGender,
        bySector: indicators.bySector,
      };
    } catch {
      return {
        available: false,
        ativos: 0,
        experiencia: 0,
        birthdays: [],
        exames: 0,
        byGender: [],
        bySector: [],
      };
    }
  }
}
