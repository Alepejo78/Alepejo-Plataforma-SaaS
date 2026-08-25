import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../../core/prisma/prisma.service';
import { attachAuditNames, attachAuditName } from '../../../core/utils/audit-names.util';

import { ChartOfAccountClassificationsRepository } from '../repositories/chart-of-account-classifications.repository';

import { CreateChartOfAccountClassificationDto } from '../dto/create-chart-of-account-classification.dto';
import { UpdateChartOfAccountClassificationDto } from '../dto/update-chart-of-account-classification.dto';
import { ChartOfAccountClassificationFilterDto } from '../dto/chart-of-account-classification-filter.dto';

@Injectable()
export class ChartOfAccountClassificationsService {
  constructor(
    private readonly repository: ChartOfAccountClassificationsRepository,
    private readonly prisma: PrismaService,
  ) {}

  async create(
    companyId: string,
    dto: CreateChartOfAccountClassificationDto,
    userId: string,
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

      return this.repository.restore(exists.id, dto, userId);
    }

    return this.repository.create(companyId, dto, userId);
  }

  async findAll(
    companyId: string,
    filter: ChartOfAccountClassificationFilterDto,
  ) {
    const result = await this.repository.findAll(companyId, filter);

    return {
      ...result,
      data: await attachAuditNames(this.prisma, result.data),
    };
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

    return attachAuditName(this.prisma, classification);
  }

  async update(
    companyId: string,
    id: string,
    dto: UpdateChartOfAccountClassificationDto,
    userId: string,
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

    return this.repository.update(id, dto, userId);
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
