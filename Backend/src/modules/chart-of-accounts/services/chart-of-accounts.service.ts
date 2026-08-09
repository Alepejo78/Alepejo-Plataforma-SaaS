import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { ChartOfAccountsRepository } from '../repositories/chart-of-accounts.repository';
import { ChartOfAccountClassificationsService } from '../../chart-of-account-classifications/services/chart-of-account-classifications.service';

import { CreateChartOfAccountDto } from '../dto/create-chart-of-account.dto';
import { UpdateChartOfAccountDto } from '../dto/update-chart-of-account.dto';
import { ChartOfAccountFilterDto } from '../dto/chart-of-account-filter.dto';

@Injectable()
export class ChartOfAccountsService {
  constructor(
    private readonly repository: ChartOfAccountsRepository,
    private readonly classificationsService: ChartOfAccountClassificationsService,
  ) {}

  async create(companyId: string, dto: CreateChartOfAccountDto) {
    if (dto.parentId) {
      await this.findOne(companyId, dto.parentId);
    }

    await this.classificationsService.findOne(
      companyId,
      dto.classificationId,
    );

    const exists = await this.repository.findByCode(companyId, dto.code);

    if (exists) {
      if (exists.active) {
        throw new ConflictException(
          'Já existe uma conta cadastrada com este código.',
        );
      }

      return this.repository.restore(exists.id, dto);
    }

    return this.repository.create(companyId, dto);
  }

  async findAll(companyId: string, filter: ChartOfAccountFilterDto) {
    return this.repository.findAll(companyId, filter);
  }

  async findOne(companyId: string, id: string) {
    const account = await this.repository.findById(companyId, id);

    if (!account) {
      throw new NotFoundException('Conta contábil não encontrada.');
    }

    return account;
  }

  async update(
    companyId: string,
    id: string,
    dto: UpdateChartOfAccountDto,
  ) {
    await this.findOne(companyId, id);

    if (dto.parentId) {
      if (dto.parentId === id) {
        throw new BadRequestException(
          'Uma conta não pode ser sua própria conta pai.',
        );
      }

      await this.findOne(companyId, dto.parentId);
    }

    if (dto.classificationId) {
      await this.classificationsService.findOne(
        companyId,
        dto.classificationId,
      );
    }

    if (dto.code) {
      const exists = await this.repository.findByCode(
        companyId,
        dto.code,
      );

      if (exists && exists.id !== id && exists.active) {
        throw new ConflictException(
          'Já existe uma conta cadastrada com este código.',
        );
      }
    }

    return this.repository.update(id, dto);
  }

  async remove(companyId: string, id: string) {
    await this.findOne(companyId, id);

    const children = await this.repository.countChildren(id);

    if (children > 0) {
      throw new BadRequestException(
        'Esta conta possui subcontas vinculadas e não pode ser excluída.',
      );
    }

    return this.repository.delete(id);
  }
}
