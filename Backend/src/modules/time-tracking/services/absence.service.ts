import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { AbsenceStatus } from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';

import { AbsenceRecordRepository } from '../repositories/absence-record.repository';

import { CreateAbsenceRecordDto } from '../dto/create-absence-record.dto';
import { UpdateAbsenceRecordDto } from '../dto/update-absence-record.dto';
import { AbsenceFilterDto } from '../dto/absence-filter.dto';

@Injectable()
export class AbsenceService {
  constructor(
    private readonly repository: AbsenceRecordRepository,
    private readonly prisma: PrismaService,
  ) {}

  async create(companyId: string, dto: CreateAbsenceRecordDto) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, companyId, active: true },
    });

    if (!employee) {
      throw new NotFoundException(
        'Colaborador não encontrado ou inativo.',
      );
    }

    return this.repository.create(companyId, dto);
  }

  async findAll(companyId: string, filter: AbsenceFilterDto) {
    return this.repository.findAll(companyId, filter);
  }

  async findOne(companyId: string, id: string) {
    const record = await this.repository.findById(companyId, id);

    if (!record) {
      throw new NotFoundException('Registro não encontrado.');
    }

    return record;
  }

  async update(
    companyId: string,
    id: string,
    dto: UpdateAbsenceRecordDto,
  ) {
    const record = await this.findOne(companyId, id);

    if (record.status !== AbsenceStatus.PENDENTE) {
      throw new BadRequestException(
        'Somente registros pendentes podem ser alterados.',
      );
    }

    return this.repository.update(id, {
      employeeId: dto.employeeId,
      date: dto.date ? new Date(dto.date) : undefined,
      type: dto.type,
      reason: dto.reason,
    });
  }

  async remove(companyId: string, id: string) {
    const record = await this.findOne(companyId, id);

    if (record.status !== AbsenceStatus.PENDENTE) {
      throw new BadRequestException(
        'Somente registros pendentes podem ser excluídos.',
      );
    }

    await this.repository.delete(id);
  }

  async approve(
    companyId: string,
    userId: string,
    id: string,
  ) {
    const record = await this.findOne(companyId, id);

    if (record.status !== AbsenceStatus.PENDENTE) {
      throw new BadRequestException(
        'Somente registros pendentes podem ser aprovados.',
      );
    }

    return this.repository.setStatus(
      id,
      AbsenceStatus.APROVADO,
      userId,
    );
  }

  async reject(
    companyId: string,
    userId: string,
    id: string,
  ) {
    const record = await this.findOne(companyId, id);

    if (record.status !== AbsenceStatus.PENDENTE) {
      throw new BadRequestException(
        'Somente registros pendentes podem ser rejeitados.',
      );
    }

    return this.repository.setStatus(
      id,
      AbsenceStatus.REJEITADO,
      userId,
    );
  }

  async reopen(companyId: string, id: string) {
    await this.findOne(companyId, id);

    return this.repository.setStatus(
      id,
      AbsenceStatus.PENDENTE,
    );
  }
}
