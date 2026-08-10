import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ExamStatus } from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';
import { toNextBusinessDay } from '../../../core/utils/business-day.util';

import { EmployeeExamsRepository } from '../repositories/employee-exams.repository';

import { CreateEmployeeExamDto } from '../dto/create-employee-exam.dto';
import { EmployeeExamFilterDto } from '../dto/employee-exam-filter.dto';

@Injectable()
export class EmployeeExamsService {
  constructor(
    private readonly repository: EmployeeExamsRepository,
    private readonly prisma: PrismaService,
  ) {}

  async create(companyId: string, dto: CreateEmployeeExamDto) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, companyId },
    });

    if (!employee) {
      throw new NotFoundException(
        'Colaborador não encontrado.',
      );
    }

    const examDate = new Date(dto.examDate);

    // Prazo contra o qual este exame é medido: o próximo exame que
    // já estava agendado, ou — se é o primeiro exame do colaborador
    // — a própria data de admissão.
    const expectedDue =
      employee.nextExamDate ?? employee.admissionDate;

    const status: ExamStatus =
      expectedDue && examDate > expectedDue
        ? 'ATRASADO'
        : 'NO_PRAZO';

    const nextYear = new Date(examDate);
    nextYear.setUTCFullYear(nextYear.getUTCFullYear() + 1);
    const nextExamDate = toNextBusinessDay(nextYear);

    const exam = await this.repository.create(
      dto.employeeId,
      examDate,
      nextExamDate,
      status,
    );

    await this.prisma.employee.update({
      where: { id: dto.employeeId },
      data: { nextExamDate },
    });

    return exam;
  }

  async findAll(companyId: string, filter: EmployeeExamFilterDto) {
    return this.repository.findAll(companyId, filter);
  }

  async remove(companyId: string, id: string) {
    const exam = await this.repository.findById(companyId, id);

    if (!exam) {
      throw new NotFoundException('Exame não encontrado.');
    }

    await this.repository.delete(id);

    // Desfaz o "próximo exame" pendente do colaborador pro valor do
    // exame anterior (ou limpa, se este era o único registrado).
    const latest = await this.repository.findLatestForEmployee(
      exam.employeeId,
    );

    await this.prisma.employee.update({
      where: { id: exam.employeeId },
      data: { nextExamDate: latest?.nextExamDate ?? null },
    });

    return exam;
  }
}
