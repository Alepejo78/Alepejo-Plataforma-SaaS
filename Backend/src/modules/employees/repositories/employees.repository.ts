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

        examDate: toDateOrUndefined(dto.examDate),
        examCompleted: dto.examCompleted ?? false,
        nextExamDate: toDateOrUndefined(dto.nextExamDate),
        noticeDays: dto.noticeDays,
        onLeave: dto.onLeave ?? false,

        transportVoucher: dto.transportVoucher ?? false,
        lockerKey: dto.lockerKey,
        lockerNumber: dto.lockerNumber,
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

        examDate: toDateOrUndefined(dto.examDate),
        examCompleted: dto.examCompleted,
        nextExamDate: toDateOrUndefined(dto.nextExamDate),
        noticeDays: dto.noticeDays,
        onLeave: dto.onLeave,

        transportVoucher: dto.transportVoucher,
        lockerKey: dto.lockerKey,
        lockerNumber: dto.lockerNumber,
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
}
