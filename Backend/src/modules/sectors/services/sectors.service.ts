import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { SectorsRepository } from '../repositories/sectors.repository';

import { CreateSectorDto } from '../dto/create-sector.dto';
import { UpdateSectorDto } from '../dto/update-sector.dto';
import { SectorFilterDto } from '../dto/sector-filter.dto';

@Injectable()
export class SectorsService {
  constructor(private readonly repository: SectorsRepository) {}

  async create(companyId: string, dto: CreateSectorDto) {
    const exists = await this.repository.findByName(
      companyId,
      dto.name,
    );

    if (exists) {
      if (exists.active) {
        throw new ConflictException(
          'Já existe um setor com este nome.',
        );
      }

      return this.repository.restore(exists.id, dto);
    }

    return this.repository.create(companyId, dto);
  }

  async findAll(companyId: string, filter: SectorFilterDto) {
    return this.repository.findAll(companyId, filter);
  }

  async findOne(companyId: string, id: string) {
    const sector = await this.repository.findById(companyId, id);

    if (!sector) {
      throw new NotFoundException('Setor não encontrado.');
    }

    return sector;
  }

  async update(
    companyId: string,
    id: string,
    dto: UpdateSectorDto,
  ) {
    await this.findOne(companyId, id);

    return this.repository.update(id, dto);
  }

  async remove(companyId: string, id: string) {
    await this.findOne(companyId, id);

    const inUse = await this.repository.countJobFunctions(id);

    if (inUse > 0) {
      throw new BadRequestException(
        'Este setor está vinculado a funções e não pode ser excluído.',
      );
    }

    return this.repository.delete(id);
  }
}
