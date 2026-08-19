import { BadRequestException, Injectable } from '@nestjs/common';
import { Employee, VacationPeriod } from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';

import { VacationPeriodRepository } from '../repositories/vacation-period.repository';

function addMonthsUTC(date: Date, months: number): Date {
  const result = new Date(date);

  result.setUTCMonth(result.getUTCMonth() + months);

  return result;
}

function addDaysUTC(date: Date, days: number): Date {
  const result = new Date(date);

  result.setUTCDate(result.getUTCDate() + days);

  return result;
}

@Injectable()
export class VacationPeriodService {
  constructor(
    private readonly repository: VacationPeriodRepository,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Devolve o período aquisitivo aberto mais antigo do colaborador
   * (usa o mais antigo primeiro — prática correta) ou cria o próximo
   * sozinho: 1º período começa na admissão, os seguintes começam no
   * dia seguinte ao fim do anterior. 12 meses de duração, mais 12
   * meses de prazo concessivo (endDate + 12 meses).
   */
  async findOrCreateGrantablePeriod(companyId: string, employeeId: string): Promise<VacationPeriod> {
    const open = await this.repository.findOpen(employeeId);

    if (open) {
      return open;
    }

    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });

    if (!employee?.admissionDate) {
      throw new BadRequestException(
        'Colaborador sem data de admissão cadastrada — não é possível calcular o período aquisitivo de férias.',
      );
    }

    const last = await this.repository.findLast(employeeId);

    const startDate = last ? addDaysUTC(last.endDate, 1) : employee.admissionDate;
    const endDate = addDaysUTC(addMonthsUTC(startDate, 12), -1);
    const concessiveDeadline = addMonthsUTC(endDate, 12);

    return this.repository.create(companyId, employeeId, startDate, endDate, concessiveDeadline);
  }

  async getBalance(companyId: string, employeeId: string) {
    const period = await this.findOrCreateGrantablePeriod(companyId, employeeId);
    const availableDays = period.totalDays - period.usedDays - period.soldDays;

    return {
      period,
      availableDays,
      overdue: new Date() > period.concessiveDeadline,
    };
  }

  async findAllByEmployee(companyId: string, employeeId: string) {
    return this.repository.findAllByEmployee(companyId, employeeId);
  }

  async assertEmployee(companyId: string, employeeId: string): Promise<Employee> {
    const employee = await this.prisma.employee.findFirst({ where: { id: employeeId, companyId } });

    if (!employee) {
      throw new BadRequestException('Colaborador não encontrado.');
    }

    return employee;
  }
}
