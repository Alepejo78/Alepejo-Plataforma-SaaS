import { Injectable } from '@nestjs/common';
import { EmployeeExam, ExamStatus } from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';

import { EmployeeExamFilterDto } from '../dto/employee-exam-filter.dto';

@Injectable()
export class EmployeeExamsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    employeeId: string,
    examDate: Date,
    nextExamDate: Date,
    status: ExamStatus,
  ): Promise<EmployeeExam> {
    return this.prisma.employeeExam.create({
      data: { employeeId, examDate, nextExamDate, status },
    });
  }

  async findAll(companyId: string, filter: EmployeeExamFilterDto) {
    const { employeeId, limit } = filter;

    return this.prisma.employeeExam.findMany({
      where: {
        employee: { companyId },
        ...(employeeId && { employeeId }),
      },
      take: limit,
      orderBy: { examDate: 'desc' },
    });
  }

  async findById(
    companyId: string,
    id: string,
  ): Promise<EmployeeExam | null> {
    return this.prisma.employeeExam.findFirst({
      where: { id, employee: { companyId } },
    });
  }

  async findLatestForEmployee(
    employeeId: string,
  ): Promise<EmployeeExam | null> {
    return this.prisma.employeeExam.findFirst({
      where: { employeeId },
      orderBy: { examDate: 'desc' },
    });
  }

  async delete(id: string): Promise<EmployeeExam> {
    return this.prisma.employeeExam.delete({
      where: { id },
    });
  }
}
