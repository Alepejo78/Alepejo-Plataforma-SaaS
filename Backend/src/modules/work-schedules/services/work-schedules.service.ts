import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { WorkSchedulesRepository } from '../repositories/work-schedules.repository';

import { CreateWorkScheduleDto } from '../dto/create-work-schedule.dto';
import { UpdateWorkScheduleDto } from '../dto/update-work-schedule.dto';
import { WorkScheduleFilterDto } from '../dto/work-schedule-filter.dto';

@Injectable()
export class WorkSchedulesService {
  constructor(
    private readonly repository: WorkSchedulesRepository,
  ) {}

  async create(companyId: string, dto: CreateWorkScheduleDto) {
    const exists = await this.repository.findByName(
      companyId,
      dto.name,
    );

    if (exists) {
      if (exists.active) {
        throw new ConflictException(
          'Já existe um horário com este nome.',
        );
      }

      return this.repository.restore(exists.id, dto);
    }

    return this.repository.create(companyId, dto);
  }

  async findAll(
    companyId: string,
    filter: WorkScheduleFilterDto,
  ) {
    return this.repository.findAll(companyId, filter);
  }

  async findOne(companyId: string, id: string) {
    const schedule = await this.repository.findById(
      companyId,
      id,
    );

    if (!schedule) {
      throw new NotFoundException('Horário não encontrado.');
    }

    return schedule;
  }

  async update(
    companyId: string,
    id: string,
    dto: UpdateWorkScheduleDto,
  ) {
    await this.findOne(companyId, id);

    return this.repository.update(id, dto);
  }

  async remove(companyId: string, id: string) {
    await this.findOne(companyId, id);

    const inUse = await this.repository.countJobFunctions(id);

    if (inUse > 0) {
      throw new BadRequestException(
        'Este horário está vinculado a funções e não pode ser excluído.',
      );
    }

    return this.repository.delete(id);
  }
}
