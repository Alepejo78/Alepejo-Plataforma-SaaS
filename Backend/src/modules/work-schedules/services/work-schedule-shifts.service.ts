import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Weekday } from '@prisma/client';

import { WorkSchedulesRepository } from '../repositories/work-schedules.repository';
import { WorkScheduleShiftRepository } from '../repositories/work-schedule-shift.repository';

import { CreateWorkScheduleShiftDto } from '../dto/create-work-schedule-shift.dto';
import { UpdateWorkScheduleShiftDto } from '../dto/update-work-schedule-shift.dto';

import { expandWeekdayRange } from '../utils/weekday.util';

@Injectable()
export class WorkScheduleShiftsService {
  constructor(
    private readonly scheduleRepository: WorkSchedulesRepository,
    private readonly repository: WorkScheduleShiftRepository,
  ) {}

  private async assertScheduleExists(
    companyId: string,
    workScheduleId: string,
  ) {
    const schedule = await this.scheduleRepository.findById(
      companyId,
      workScheduleId,
    );

    if (!schedule) {
      throw new NotFoundException(
        'Horário de trabalho não encontrado.',
      );
    }
  }

  private async assertNoOverlap(
    companyId: string,
    workScheduleId: string,
    dto: { dayFrom: Weekday; dayTo: Weekday },
    ignoreId?: string,
  ) {
    const days = expandWeekdayRange(dto.dayFrom, dto.dayTo);

    if (days.length === 0) {
      throw new BadRequestException(
        'Faixa de dias inválida — "De" deve vir antes ou igual a "Até" na semana.',
      );
    }

    const existing = await this.repository.findAll(
      companyId,
      workScheduleId,
    );

    for (const shift of existing) {
      if (shift.id === ignoreId) {
        continue;
      }

      const shiftDays = expandWeekdayRange(
        shift.dayFrom,
        shift.dayTo,
      );

      if (shiftDays.some((day) => days.includes(day))) {
        throw new BadRequestException(
          'Já existe uma faixa cadastrada cobrindo algum desses dias.',
        );
      }
    }
  }

  async create(
    companyId: string,
    workScheduleId: string,
    dto: CreateWorkScheduleShiftDto,
  ) {
    await this.assertScheduleExists(companyId, workScheduleId);
    await this.assertNoOverlap(companyId, workScheduleId, dto);

    return this.repository.create(companyId, workScheduleId, dto);
  }

  async findAll(companyId: string, workScheduleId: string) {
    await this.assertScheduleExists(companyId, workScheduleId);

    return this.repository.findAll(companyId, workScheduleId);
  }

  async update(
    companyId: string,
    workScheduleId: string,
    id: string,
    dto: UpdateWorkScheduleShiftDto,
  ) {
    const shift = await this.repository.findById(companyId, id);

    if (!shift || shift.workScheduleId !== workScheduleId) {
      throw new NotFoundException('Faixa não encontrada.');
    }

    if (dto.dayFrom || dto.dayTo) {
      await this.assertNoOverlap(
        companyId,
        workScheduleId,
        {
          dayFrom: dto.dayFrom ?? shift.dayFrom,
          dayTo: dto.dayTo ?? shift.dayTo,
        },
        id,
      );
    }

    return this.repository.update(id, dto);
  }

  async remove(
    companyId: string,
    workScheduleId: string,
    id: string,
  ) {
    const shift = await this.repository.findById(companyId, id);

    if (!shift || shift.workScheduleId !== workScheduleId) {
      throw new NotFoundException('Faixa não encontrada.');
    }

    await this.repository.delete(id);
  }
}
