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

  async create(dto: CreateClientDto) {
    const exists = await this.repository.findByDocument(
      dto.companyId,
      dto.document,
    );

    if (exists) {
      throw new BadRequestException(
        'Já existe um cliente com este CPF/CNPJ.',
      );
    }

    return this.repository.create(dto);
  }

  async findAll(filter: ClientFilterDto) {
    return this.repository.findAll(filter);
  }

  async findById(id: string) {
    const client = await this.repository.findById(id);

    if (!client) {
      throw new NotFoundException(
        'Cliente não encontrado.',
      );
    }

    return client;
  }

  async update(
    id: string,
    dto: UpdateClientDto,
  ) {
    await this.findById(id);

    if (dto.document && dto.companyId) {
      const exists = await this.repository.findByDocument(
        dto.companyId,
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

  async remove(id: string) {
    await this.findById(id);

    return this.repository.softDelete(id);
  }
}