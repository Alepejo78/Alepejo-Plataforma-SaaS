import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PpeTypesRepository } from '../repositories/ppe-types.repository';

import { CreatePpeTypeDto } from '../dto/create-ppe-type.dto';
import { UpdatePpeTypeDto } from '../dto/update-ppe-type.dto';
import { PpeTypeFilterDto } from '../dto/ppe-type-filter.dto';

@Injectable()
export class PpeTypesService {
  constructor(private readonly repository: PpeTypesRepository) {}

  async create(companyId: string, dto: CreatePpeTypeDto) {
    const exists = await this.repository.findByName(
      companyId,
      dto.name,
    );

    if (exists) {
      if (exists.active) {
        throw new ConflictException(
          'Já existe um tipo de EPI com este nome.',
        );
      }

      return this.repository.restore(exists.id, dto);
    }

    return this.repository.create(companyId, dto);
  }

  async findAll(companyId: string, filter: PpeTypeFilterDto) {
    return this.repository.findAll(companyId, filter);
  }

  async findOne(companyId: string, id: string) {
    const ppeType = await this.repository.findById(
      companyId,
      id,
    );

    if (!ppeType) {
      throw new NotFoundException(
        'Tipo de EPI não encontrado.',
      );
    }

    return ppeType;
  }

  async update(
    companyId: string,
    id: string,
    dto: UpdatePpeTypeDto,
  ) {
    await this.findOne(companyId, id);

    return this.repository.update(id, dto);
  }

  async remove(companyId: string, id: string) {
    await this.findOne(companyId, id);

    const inUse = await this.repository.countJobFunctions(id);

    if (inUse > 0) {
      throw new BadRequestException(
        'Este tipo de EPI está vinculado a funções e não pode ser excluído.',
      );
    }

    return this.repository.delete(id);
  }
}
