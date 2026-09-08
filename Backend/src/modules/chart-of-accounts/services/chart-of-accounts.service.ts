import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ChartOfAccountType } from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';
import { attachAuditNames, attachAuditName } from '../../../core/utils/audit-names.util';

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
    private readonly prisma: PrismaService,
  ) {}

  async create(
    companyId: string,
    dto: CreateChartOfAccountDto,
    userId: string,
  ) {
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

      return this.repository.restore(exists.id, dto, userId);
    }

    return this.repository.create(companyId, dto, userId);
  }

  /**
   * Suporte ao dono da plataforma: importa um plano de contas inteiro
   * (classificações + contas) de uma vez pra uma empresa cliente que
   * já tem o próprio plano em outro lugar (ex.: planilha) e precisa
   * trazer tudo. O que já existir com o mesmo código é ATUALIZADO
   * (descrição/classificação/tipo), nunca duplicado — diferente de
   * `create()`, que rejeita código repetido.
   */
  async bulkImport(
    companyId: string,
    userId: string,
    groups: {
      classification: string;
      type?: ChartOfAccountType;
      accounts: { code: string; description: string }[];
    }[],
  ) {
    const result = {
      classifications: 0,
      accountsCreated: 0,
      accountsUpdated: 0,
    };

    for (const group of groups) {
      const classification =
        await this.classificationsService.findOrCreateByName(
          companyId,
          group.classification,
          userId,
        );

      result.classifications += 1;

      const type = group.type ?? 'DESPESA';

      for (const account of group.accounts) {
        const code = account.code.trim();
        const description = account.description.trim();
        const existing = await this.repository.findByCode(
          companyId,
          code,
        );

        if (existing) {
          await this.repository.update(
            existing.id,
            {
              description,
              classificationId: classification.id,
              type,
              active: true,
            },
            userId,
          );
          result.accountsUpdated += 1;
        } else {
          await this.repository.create(
            companyId,
            {
              code,
              description,
              classificationId: classification.id,
              type,
            },
            userId,
          );
          result.accountsCreated += 1;
        }
      }
    }

    return result;
  }

  async findAll(companyId: string, filter: ChartOfAccountFilterDto) {
    const result = await this.repository.findAll(companyId, filter);

    return {
      ...result,
      data: await attachAuditNames(this.prisma, result.data),
    };
  }

  async findOne(companyId: string, id: string) {
    const account = await this.repository.findById(companyId, id);

    if (!account) {
      throw new NotFoundException('Conta contábil não encontrada.');
    }

    return attachAuditName(this.prisma, account);
  }

  async update(
    companyId: string,
    id: string,
    dto: UpdateChartOfAccountDto,
    userId: string,
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

    return this.repository.update(id, dto, userId);
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
