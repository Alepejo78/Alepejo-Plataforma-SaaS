import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Employee, Prisma } from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';
import { DocumentSequenceService } from '../../../core/document-sequence/document-sequence.service';

import { InAppNotificationsService } from '../../in-app-notifications/services/in-app-notifications.service';

import { EmployeesRepository } from '../repositories/employees.repository';

import { CreateEmployeeDto } from '../dto/create-employee.dto';
import { UpdateEmployeeDto } from '../dto/update-employee.dto';
import { EmployeeFilterDto } from '../dto/employee-filter.dto';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const SEQUENCE_TYPE = 'EMPLOYEE';

@Injectable()
export class EmployeesService {
  constructor(
    private readonly repository: EmployeesRepository,
    private readonly prisma: PrismaService,
    private readonly documentSequence: DocumentSequenceService,
    private readonly notifications: InAppNotificationsService,
  ) {}

  /**
   * Resolve em qual empresa o colaborador é criado: a da sessão por
   * padrão, ou outra do mesmo grupo se `requestedCompanyId` vier
   * preenchido (seletor de empresa da tela "Interprise → Colaboradores").
   * Nunca confia no valor cru — sempre confere que pertence ao grupo.
   */
  private async resolveTargetCompany(
    sessionCompanyId: string,
    rootCompanyId: string,
    requestedCompanyId?: string,
  ): Promise<string> {
    if (
      !requestedCompanyId ||
      requestedCompanyId === sessionCompanyId
    ) {
      return sessionCompanyId;
    }

    const target = await this.prisma.company.findFirst({
      where: {
        id: requestedCompanyId,
        OR: [{ id: rootCompanyId }, { rootCompanyId }],
      },
      select: { id: true },
    });

    if (!target) {
      throw new BadRequestException(
        'A empresa informada não pertence ao seu grupo.',
      );
    }

    return target.id;
  }

  private handleUniqueConstraint(err: unknown): never {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      const target = err.meta?.target;
      const targetStr = Array.isArray(target)
        ? target.join(',')
        : String(target ?? '');

      if (targetStr.includes('userId')) {
        throw new ConflictException(
          'Esse usuário já está vinculado a outro colaborador.',
        );
      }

      throw new ConflictException(
        'Já existe um colaborador cadastrado com este CPF.',
      );
    }

    throw err;
  }

  /**
   * Aplica as regras automáticas do cadastro antes de gravar:
   * - Vencimento da experiência = admissão + estágio escolhido
   *   (30/60/90) — sempre recalculado aqui, nunca confia só no que o
   *   front mandou, pra nunca ficar em branco.
   * - Data de demissão preenchida força status Demitido.
   * - Dias de aviso preenchido força Afastado.
   * - Fim do afastamento/férias = início + dias, sempre recalculado
   *   aqui (mesmo padrão da experiência). Início preenchido força
   *   Afastado/Em férias.
   */
  private applyBusinessRules(
    dto: CreateEmployeeDto | UpdateEmployeeDto,
    existing?: Employee,
  ) {
    const admissionDate =
      dto.admissionDate ??
      (existing?.admissionDate
        ? existing.admissionDate.toISOString()
        : undefined);

    const stageDays =
      dto.experienceStageDays ??
      existing?.experienceStageDays ??
      30;

    if (admissionDate) {
      const end = new Date(admissionDate);
      end.setUTCDate(end.getUTCDate() + stageDays);

      dto.experienceStageDays = stageDays;
      dto.experienceEndDate = end.toISOString();
    }

    if (dto.terminationDate) {
      dto.status = 'DEMITIDO';
    }

    if (dto.noticeDays && dto.noticeDays > 0) {
      dto.onLeave = true;
    }

    const leaveStartDate =
      dto.leaveStartDate ??
      (existing?.leaveStartDate
        ? existing.leaveStartDate.toISOString()
        : undefined);

    const leaveDays = dto.leaveDays ?? existing?.leaveDays;

    if (leaveStartDate && leaveDays) {
      const end = new Date(leaveStartDate);
      end.setUTCDate(end.getUTCDate() + leaveDays);

      dto.leaveEndDate = end.toISOString();
    }

    if (leaveStartDate) {
      dto.onLeave = true;
    }

    const vacationStartDate =
      dto.vacationStartDate ??
      (existing?.vacationStartDate
        ? existing.vacationStartDate.toISOString()
        : undefined);

    const vacationDays =
      dto.vacationDays ?? existing?.vacationDays;

    if (vacationStartDate && vacationDays) {
      const end = new Date(vacationStartDate);
      end.setUTCDate(end.getUTCDate() + vacationDays);

      dto.vacationEndDate = end.toISOString();
    }

    if (vacationStartDate) {
      dto.onVacation = true;
    }

    return dto;
  }

  /**
   * Avança sozinho o estágio de experiência (30→60→90 dias) conforme
   * o prazo vence, e efetiva o colaborador (status ATIVO) quando os
   * 90 dias passam — sem isso, quem não editar o cadastro a tempo
   * ficaria com a data de término desatualizada. Roda a cada leitura
   * (lista/detalhe), não precisa de rotina agendada à parte.
   */
  private async reconcileExperience(
    employees: Employee[],
  ): Promise<void> {
    const today = new Date();

    await Promise.all(
      employees.map(async (employee) => {
        if (
          employee.status !== 'EXPERIENCIA' ||
          !employee.admissionDate
        ) {
          return;
        }

        const stage = employee.experienceStageDays ?? 30;
        const elapsedDays = Math.floor(
          (today.getTime() -
            employee.admissionDate.getTime()) /
            MS_PER_DAY,
        );

        const targetStage =
          elapsedDays > 60 ? 90 : elapsedDays > 30 ? 60 : 30;

        const efetivado = elapsedDays > 90;

        if (targetStage <= stage && !efetivado) {
          return;
        }

        const finalStage = Math.max(stage, targetStage);

        const experienceEndDate = new Date(
          employee.admissionDate,
        );
        experienceEndDate.setUTCDate(
          experienceEndDate.getUTCDate() + finalStage,
        );

        employee.experienceStageDays = finalStage;
        employee.experienceEndDate = experienceEndDate;

        if (efetivado) {
          employee.status = 'ATIVO';
        }

        await this.repository.updateExperienceState(
          employee.id,
          {
            experienceStageDays: finalStage,
            experienceEndDate,
            status: efetivado ? 'ATIVO' : undefined,
          },
        );
      }),
    );
  }

  async create(
    companyId: string,
    rootCompanyId: string,
    dto: CreateEmployeeDto,
    userId: string,
  ) {
    const targetCompanyId = await this.resolveTargetCompany(
      companyId,
      rootCompanyId,
      dto.companyId,
    );

    this.applyBusinessRules(dto);

    let created: Employee | undefined;

    try {
      created = await this.prisma.$transaction(async (tx) => {
        const employeeNumber = await this.documentSequence.next(
          tx,
          targetCompanyId,
          SEQUENCE_TYPE,
        );

        return this.repository.create(
          tx,
          targetCompanyId,
          employeeNumber,
          dto,
        );
      });
    } catch (err) {
      this.handleUniqueConstraint(err);
    }

    if (created) {
      void this.notifications.emit({
        rootCompanyId,
        type: 'NEW_EMPLOYEE',
        dedupeKey: `new-employee:${created.id}`,
        title: 'Novo colaborador cadastrado',
        message: `${created.name} foi cadastrado.`,
        permissionCode: 'employee.view',
        linkUrl: '/erp/rh/colaboradores',
        documentRef: created.name,
        actorUserId: userId,
      });
    }

    return created;
  }

  async findAll(companyId: string, filter: EmployeeFilterDto) {
    const result = await this.repository.findAll(
      companyId,
      filter,
    );

    await this.reconcileExperience(result.data);

    return result;
  }

  /** Colaboradores de todas as empresas do grupo — tela "Interprise → Colaboradores". */
  async findAllInGroup(
    rootCompanyId: string,
    filter: EmployeeFilterDto,
  ) {
    const result = await this.repository.findAllInGroup(
      rootCompanyId,
      filter,
    );

    await this.reconcileExperience(result.data);

    return result;
  }

  async findOne(companyId: string, id: string) {
    const employee = await this.repository.findById(
      companyId,
      id,
    );

    if (!employee) {
      throw new NotFoundException(
        'Colaborador não encontrado.',
      );
    }

    await this.reconcileExperience([employee]);

    return employee;
  }

  /** Colaborador vinculado ao usuário logado (autoatendimento — ex.: Ponto - Manual). */
  async findMine(companyId: string, userId: string) {
    const employee = await this.repository.findByUserId(
      companyId,
      userId,
    );

    if (!employee) {
      throw new NotFoundException(
        'Seu usuário ainda não está vinculado a um colaborador — peça pro RH vincular no seu cadastro.',
      );
    }

    await this.reconcileExperience([employee]);

    return employee;
  }

  async update(
    companyId: string,
    id: string,
    dto: UpdateEmployeeDto,
  ) {
    const existing = await this.findOne(companyId, id);

    this.applyBusinessRules(dto, existing);

    try {
      return await this.repository.update(id, dto);
    } catch (err) {
      this.handleUniqueConstraint(err);
    }
  }

  async remove(companyId: string, id: string) {
    await this.findOne(companyId, id);

    return this.repository.delete(id);
  }

  async getBirthdays(companyId: string, month?: number) {
    const employees =
      await this.repository.findActiveForReports(companyId);

    return this.buildBirthdays(employees, month);
  }

  /** Mesmo relatório, mas somando os aniversariantes de todas as empresas do grupo. */
  async getBirthdaysInGroup(rootCompanyId: string, month?: number) {
    const employees =
      await this.repository.findActiveForReportsInGroup(
        rootCompanyId,
      );

    return this.buildBirthdays(employees, month);
  }

  private buildBirthdays(
    employees: Awaited<
      ReturnType<EmployeesRepository['findActiveForReports']>
    >,
    month?: number,
  ) {
    const targetMonth =
      month && month >= 1 && month <= 12
        ? month
        : new Date().getMonth() + 1;

    return employees
      .filter(
        (e) =>
          e.birthDate &&
          e.birthDate.getUTCMonth() + 1 === targetMonth,
      )
      .map((e) => ({
        id: e.id,
        name: e.name,
        day: e.birthDate!.getUTCDate(),
        birthDate: e.birthDate,
        jobFunctionName: e.jobFunction?.name ?? null,
        sectorName: e.jobFunction?.sector?.name ?? null,
      }))
      .sort((a, b) => a.day - b.day);
  }

  async getIndicators(companyId: string) {
    const employees =
      await this.repository.findActiveForReports(companyId);

    return this.buildIndicators(employees);
  }

  /** Mesmos indicadores, mas somando todas as empresas do grupo — dashboard consolidado do administrador. */
  async getIndicatorsInGroup(rootCompanyId: string) {
    const employees =
      await this.repository.findActiveForReportsInGroup(
        rootCompanyId,
      );

    return this.buildIndicators(employees);
  }

  private buildIndicators(
    employees: Awaited<
      ReturnType<EmployeesRepository['findActiveForReports']>
    >,
  ) {
    const salaries = employees
      .map((e) => (e.baseSalary ? Number(e.baseSalary) : null))
      .filter((v): v is number => v !== null);

    const averageSalary = salaries.length
      ? salaries.reduce((a, b) => a + b, 0) / salaries.length
      : 0;

    const byFunction = this.groupBy(
      employees,
      (e) => e.jobFunction?.id ?? 'none',
      (e) => e.jobFunction?.name ?? 'Sem função',
    ).map((group) => {
      const groupSalaries = group.items
        .map((e) => (e.baseSalary ? Number(e.baseSalary) : null))
        .filter((v): v is number => v !== null);

      return {
        jobFunctionId: group.key === 'none' ? null : group.key,
        jobFunctionName: group.label,
        count: group.items.length,
        averageSalary: groupSalaries.length
          ? groupSalaries.reduce((a, b) => a + b, 0) /
            groupSalaries.length
          : 0,
      };
    });

    const bySector = this.groupBy(
      employees,
      (e) => e.jobFunction?.sector?.id ?? 'none',
      (e) => e.jobFunction?.sector?.name ?? 'Sem setor',
    ).map((group) => ({
      sectorId: group.key === 'none' ? null : group.key,
      sectorName: group.label,
      count: group.items.length,
    }));

    const byStatus = this.groupBy(
      employees,
      (e) => e.status,
      (e) => e.status,
    ).map((group) => ({
      status: group.key,
      count: group.items.length,
    }));

    const byGender = this.groupBy(
      employees,
      (e) => e.gender ?? 'none',
      (e) => e.gender ?? 'none',
    ).map((group) => ({
      gender: group.key === 'none' ? null : group.key,
      count: group.items.length,
    }));

    return {
      totalActive: employees.length,
      averageSalary,
      byFunction,
      bySector,
      byStatus,
      byGender,
    };
  }

  private groupBy<T>(
    items: T[],
    keyFn: (item: T) => string,
    labelFn: (item: T) => string,
  ) {
    const groups = new Map<
      string,
      { key: string; label: string; items: T[] }
    >();

    for (const item of items) {
      const key = keyFn(item);

      if (!groups.has(key)) {
        groups.set(key, { key, label: labelFn(item), items: [] });
      }

      groups.get(key)!.items.push(item);
    }

    return Array.from(groups.values()).sort(
      (a, b) => b.items.length - a.items.length,
    );
  }
}
