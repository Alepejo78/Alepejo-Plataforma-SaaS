import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { ChartOfAccountClassificationsRepository } from '../repositories/chart-of-account-classifications.repository';

import { CreateChartOfAccountClassificationDto } from '../dto/create-chart-of-account-classification.dto';
import { UpdateChartOfAccountClassificationDto } from '../dto/update-chart-of-account-classification.dto';
import { ChartOfAccountClassificationFilterDto } from '../dto/chart-of-account-classification-filter.dto';

@Injectable()
export class ChartOfAccountClassificationsService {
  constructor(
    private readonly repository: ChartOfAccountClassificationsRepository,
  ) {}

  async create(
    companyId: string,
    dto: CreateChartOfAccountClassificationDto,
  ) {
    dto.name = dto.name.trim();

    const exists = await this.repository.findByName(
      companyId,
      dto.name,
    );

    if (exists) {
      if (exists.active) {
        throw new ConflictException(
          'Já existe uma classificação com este nome.',
        );
      }

      return this.repository.restore(exists.id, dto);
    }

    return this.repository.create(companyId, dto);
  }

  async findAll(
    companyId: string,
    filter: ChartOfAccountClassificationFilterDto,
  ) {
    return this.repository.findAll(companyId, filter);
  }

  async findOne(companyId: string, id: string) {
    const classification = await this.repository.findById(
      companyId,
      id,
    );

    if (!classification) {
      throw new NotFoundException(
        'Classificação não encontrada.',
      );
    }

    return classification;
  }

  async update(
    companyId: string,
    id: string,
    dto: UpdateChartOfAccountClassificationDto,
  ) {
    await this.findOne(companyId, id);

    if (dto.name) {
      dto.name = dto.name.trim();

      const exists = await this.repository.findByName(
        companyId,
        dto.name,
      );

      if (exists && exists.id !== id && exists.active) {
        throw new ConflictException(
          'Já existe uma classificação com este nome.',
        );
      }
    }

    return this.repository.update(id, dto);
  }

  async remove(companyId: string, id: string) {
    await this.findOne(companyId, id);

    const inUse = await this.repository.countAccounts(id);

    if (inUse > 0) {
      throw new BadRequestException(
        'Esta classificação está vinculada a contas do plano de contas e não pode ser excluída.',
      );
    }

    return this.repository.delete(id);
  }
}
