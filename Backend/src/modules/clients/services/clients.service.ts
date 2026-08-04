import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { ClientsRepository } from '../repositories/clients.repository';

import { CreateClientDto } from '../dto/create-client.dto';
import { UpdateClientDto } from '../dto/update-client.dto';
import { ClientFilterDto } from '../dto/client-filter.dto';

@Injectable()
export class ClientsService {
  constructor(
    private readonly repository: ClientsRepository,
  ) {}

  async create(companyId: string, dto: CreateClientDto) {
    const exists = await this.repository.findByDocument(
      companyId,
      dto.document,
    );

    if (exists) {
      throw new BadRequestException(
        'Já existe um cliente com este CPF/CNPJ.',
      );
    }

    return this.repository.create(companyId, dto);
  }

  async findAll(companyId: string, filter: ClientFilterDto) {
    return this.repository.findAll(companyId, filter);
  }

  async findById(companyId: string, id: string) {
    const client = await this.repository.findById(companyId, id);

    if (!client) {
      throw new NotFoundException(
        'Cliente não encontrado.',
      );
    }

    return client;
  }

  async update(
    companyId: string,
    id: string,
    dto: UpdateClientDto,
  ) {
    await this.findById(companyId, id);

    if (dto.document) {
      const exists = await this.repository.findByDocument(
        companyId,
        dto.document,
      );

      if (exists && exists.id !== id) {
        throw new BadRequestException(
          'CPF/CNPJ já cadastrado.',
        );
      }
    }

    return this.repository.update(id, dto);
  }

  async remove(companyId: string, id: string) {
    await this.findById(companyId, id);

    return this.repository.softDelete(id);
  }
}
