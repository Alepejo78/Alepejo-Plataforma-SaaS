import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { BenefitsRepository } from '../repositories/benefits.repository';

import { CreateBenefitDto } from '../dto/create-benefit.dto';
import { UpdateBenefitDto } from '../dto/update-benefit.dto';
import { BenefitFilterDto } from '../dto/benefit-filter.dto';

@Injectable()
export class BenefitsService {
  constructor(private readonly repository: BenefitsRepository) {}

  async create(companyId: string, dto: CreateBenefitDto) {
    const exists = await this.repository.findByName(
      companyId,
      dto.name,
    );

    if (exists) {
      if (exists.active) {
        throw new ConflictException(
          'Já existe um benefício com este nome.',
        );
      }

      return this.repository.restore(exists.id, dto);
    }

    return this.repository.create(companyId, dto);
  }

  async findAll(companyId: string, filter: BenefitFilterDto) {
    return this.repository.findAll(companyId, filter);
  }

  async findOne(companyId: string, id: string) {
    const benefit = await this.repository.findById(
      companyId,
      id,
    );

    if (!benefit) {
      throw new NotFoundException(
        'Benefício não encontrado.',
      );
    }

    return benefit;
  }

  async update(
    companyId: string,
    id: string,
    dto: UpdateBenefitDto,
  ) {
    await this.findOne(companyId, id);

    return this.repository.update(id, dto);
  }

  async remove(companyId: string, id: string) {
    await this.findOne(companyId, id);

    const inUse = await this.repository.countEmployeeBenefits(id);

    if (inUse > 0) {
      throw new BadRequestException(
        'Este benefício está concedido a colaboradores e não pode ser excluído.',
      );
    }

    return this.repository.delete(id);
  }
}
