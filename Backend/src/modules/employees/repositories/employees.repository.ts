import { Injectable } from '@nestjs/common';
import { Employee, Prisma } from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';

import { CreateEmployeeDto } from '../dto/create-employee.dto';
import { UpdateEmployeeDto } from '../dto/update-employee.dto';
import { EmployeeFilterDto } from '../dto/employee-filter.dto';

const includeRelations = {
  jobFunction: { include: { sector: true, ppeTypes: true } },
  workSchedule: true,
  dependents: true,
  employeeBenefits: { include: { benefit: true } },
} satisfies Prisma.EmployeeInclude;

function toDateOrUndefined(value?: string) {
  return value ? new Date(value) : undefined;
}

@Injectable()
export class EmployeesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    companyId: string,
    dto: CreateEmployeeDto,
  ): Promise<Employee> {
    return this.prisma.employee.create({
      data: {
        companyId,
        name: dto.name,
        fatherName: dto.fatherName,
        motherName: dto.motherName,
        birthDate: toDateOrUndefined(dto.birthDate),
        gender: dto.gender,
        birthCity: dto.birthCity,
        birthState: dto.birthState,
        maritalStatus: dto.maritalStatus,
        educationLevel: dto.educationLevel,

        cpf: dto.cpf,
        rg: dto.rg,
        workCard: dto.workCard,
        workCardSeries: dto.workCardSeries,
        pis: dto.pis,

        zipCode: dto.zipCode,
        street: dto.street,
        number: dto.number,
        district: dto.district,
        city: dto.city,
        state: dto.state,
        phone: dto.phone,
        mobile: dto.mobile,
        email: dto.email,

        jobFunctionId: dto.jobFunctionId,
        workScheduleId: dto.workScheduleId,
        baseSalary: dto.baseSalary,
        salaryType: dto.salaryType,
        paymentMethod: dto.paymentMethod,
        admissionDate: toDateOrUndefined(dto.admissionDate),
        experienceStageDays: dto.experienceStageDays ?? 30,
        experienceEndDate: toDateOrUndefined(
          dto.experienceEndDate,
        ),
        contractEndDate: toDateOrUndefined(
          dto.contractEndDate,
        ),
        terminationDate: toDateOrUndefined(
          dto.terminationDate,
        ),
        status: dto.status,
        badgeCode: dto.badgeCode,
        userId: dto.userId,

        bankName: dto.bankName,
        bankAgency: dto.bankAgency,
        bankAccount: dto.bankAccount,
        bankAccountType: dto.bankAccountType,
        pixKeyType: dto.pixKeyType,
        pixKey: dto.pixKey,

        nextExamDate: toDateOrUndefined(dto.nextExamDate),
        noticeDays: dto.noticeDays,
        examReminderDays: dto.examReminderDays,
        onLeave: dto.onLeave ?? false,

        leaveStartDate: toDateOrUndefined(dto.leaveStartDate),
        leaveDays: dto.leaveDays,
        leaveEndDate: toDateOrUndefined(dto.leaveEndDate),

        vacationStartDate: toDateOrUndefined(
          dto.vacationStartDate,
        ),
        vacationDays: dto.vacationDays,
        vacationEndDate: toDateOrUndefined(
          dto.vacationEndDate,
        ),
        onVacation: dto.onVacation ?? false,

        lockerKey: dto.lockerKey,
        lockerNumber: dto.lockerNumber,
        shoeSize: dto.shoeSize,
        shirtSize: dto.shirtSize,
        pantsSize: dto.pantsSize,
        observation: dto.observation,

        active: dto.active ?? true,

        dependents: dto.dependents
          ? {
              create: dto.dependents.map((dep) => ({
                name: dep.name,
                birthDate: toDateOrUndefined(dep.birthDate),
                relationship: dep.relationship,
              })),
            }
          : undefined,

        employeeBenefits: dto.benefits
          ? {
              create: dto.benefits.map((b) => ({
                benefitId: b.benefitId,
                value: b.value,
                percentage: b.percentage,
              })),
            }
          : undefined,
      },
      include: includeRelations,
    });
  }

  async findById(
    companyId: string,
    id: string,
  ): Promise<Employee | null> {
    return this.prisma.employee.findFirst({
      where: { id, companyId },
      include: includeRelations,
    });
  }

  async findByUserId(
    companyId: string,
    userId: string,
  ): Promise<Employee | null> {
    return this.prisma.employee.findFirst({
      where: { companyId, userId },
      include: includeRelations,
    });
  }

  async findAll(companyId: string, filter: EmployeeFilterDto) {
    const {
      search,
      jobFunctionId,
      status,
      page,
      limit,
      orderBy,
      order,
    } = filter;

    const where: Prisma.EmployeeWhereInput = {
      companyId,
      active: true,
      ...(jobFunctionId && { jobFunctionId }),
      ...(status && { status }),

      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { cpf: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.employee.findMany({
        where,
        include: includeRelations,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [orderBy]: order },
      }),

      this.prisma.employee.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Colaboradores de TODAS as empresas do grupo (frente "Interprise")
   * — mesmo filtro de `findAll`, só troca `companyId` exato por um
   * JOIN via `company.rootCompanyId`. Não substitui `findAll`: telas
   * de folha/ponto continuam escopadas pela empresa real da sessão.
   */
  async findAllInGroup(
    rootCompanyId: string,
    filter: EmployeeFilterDto,
  ) {
    const {
      search,
      jobFunctionId,
      status,
      page,
      limit,
      orderBy,
      order,
    } = filter;

    const where: Prisma.EmployeeWhereInput = {
      company: {
        OR: [{ id: rootCompanyId }, { rootCompanyId }],
      },
      active: true,
      ...(jobFunctionId && { jobFunctionId }),
      ...(status && { status }),

      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { cpf: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.employee.findMany({
        where,
        include: { ...includeRelations, company: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [orderBy]: order },
      }),

      this.prisma.employee.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  async update(
    id: string,
    dto: UpdateEmployeeDto,
  ): Promise<Employee> {
    return this.prisma.employee.update({
      where: { id },
      data: {
        name: dto.name,
        fatherName: dto.fatherName,
        motherName: dto.motherName,
        birthDate: toDateOrUndefined(dto.birthDate),
        gender: dto.gender,
        birthCity: dto.birthCity,
        birthState: dto.birthState,
        maritalStatus: dto.maritalStatus,
        educationLevel: dto.educationLevel,

        cpf: dto.cpf,
        rg: dto.rg,
        workCard: dto.workCard,
        workCardSeries: dto.workCardSeries,
        pis: dto.pis,

        zipCode: dto.zipCode,
        street: dto.street,
        number: dto.number,
        district: dto.district,
        city: dto.city,
        state: dto.state,
        phone: dto.phone,
        mobile: dto.mobile,
        email: dto.email,

        jobFunctionId: dto.jobFunctionId,
        workScheduleId: dto.workScheduleId,
        baseSalary: dto.baseSalary,
        salaryType: dto.salaryType,
        paymentMethod: dto.paymentMethod,
        admissionDate: toDateOrUndefined(dto.admissionDate),
        experienceStageDays: dto.experienceStageDays,
        experienceEndDate: toDateOrUndefined(
          dto.experienceEndDate,
        ),
        contractEndDate: toDateOrUndefined(
          dto.contractEndDate,
        ),
        terminationDate: toDateOrUndefined(
          dto.terminationDate,
        ),
        status: dto.status,
        badgeCode: dto.badgeCode,
        userId: dto.userId,

        bankName: dto.bankName,
        bankAgency: dto.bankAgency,
        bankAccount: dto.bankAccount,
        bankAccountType: dto.bankAccountType,
        pixKeyType: dto.pixKeyType,
        pixKey: dto.pixKey,

        nextExamDate: toDateOrUndefined(dto.nextExamDate),
        noticeDays: dto.noticeDays,
        examReminderDays: dto.examReminderDays,
        onLeave: dto.onLeave,

        leaveStartDate: toDateOrUndefined(dto.leaveStartDate),
        leaveDays: dto.leaveDays,
        leaveEndDate: toDateOrUndefined(dto.leaveEndDate),

        vacationStartDate: toDateOrUndefined(
          dto.vacationStartDate,
        ),
        vacationDays: dto.vacationDays,
        vacationEndDate: toDateOrUndefined(
          dto.vacationEndDate,
        ),
        onVacation: dto.onVacation,

        lockerKey: dto.lockerKey,
        lockerNumber: dto.lockerNumber,
        shoeSize: dto.shoeSize,
        shirtSize: dto.shirtSize,
        pantsSize: dto.pantsSize,
        observation: dto.observation,
        active: dto.active,

        // Substitui a lista inteira de dependentes quando enviada —
        // mais simples que tentar diferenciar quem mudou, e a lista
        // nunca é grande (a planilha original limitava a 5).
        ...(dto.dependents !== undefined && {
          dependents: {
            deleteMany: {},
            create: dto.dependents.map((dep) => ({
              name: dep.name,
              birthDate: toDateOrUndefined(dep.birthDate),
              relationship: dep.relationship,
            })),
          },
        }),

        ...(dto.benefits !== undefined && {
          employeeBenefits: {
            deleteMany: {},
            create: dto.benefits.map((b) => ({
              benefitId: b.benefitId,
              value: b.value,
              percentage: b.percentage,
            })),
          },
        }),
      },
      include: includeRelations,
    });
  }

  async delete(id: string): Promise<Employee> {
    return this.prisma.employee.update({
      where: { id },
      data: { active: false },
    });
  }

  /** Atualização pontual usada pela reconciliação automática do estágio de experiência. */
  async updateExperienceState(
    id: string,
    data: {
      experienceStageDays: number;
      experienceEndDate: Date;
      status?: 'ATIVO';
    },
  ): Promise<void> {
    await this.prisma.employee.update({
      where: { id },
      data,
    });
  }

  async findActiveForReports(companyId: string) {
    return this.prisma.employee.findMany({
      where: { companyId, active: true },
      select: {
        id: true,
        name: true,
        birthDate: true,
        gender: true,
        status: true,
        baseSalary: true,
        jobFunction: {
          select: {
            id: true,
            name: true,
            sector: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }
}
