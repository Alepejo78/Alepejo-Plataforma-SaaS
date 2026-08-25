import {
    ConflictException,
    Injectable,
    NotFoundException,
  } from '@nestjs/common';
  import { PrismaService } from '../../../core/prisma/prisma.service';
  import { attachAuditNames, attachAuditName } from '../../../core/utils/audit-names.util';
  import { CreateWarehouseDto } from '../dto/create-warehouse.dto';
  import { UpdateWarehouseDto } from '../dto/update-warehouse.dto';
  import { WarehouseFilterDto } from '../dto/warehouse-filter.dto';
  import { WarehouseRepository } from '../repositories/warehouse.repository';

  @Injectable()
  export class WarehouseService {
    constructor(
      private readonly repository: WarehouseRepository,
      private readonly prisma: PrismaService,
    ) {}

    async create(
      companyId: string,
      dto: CreateWarehouseDto,
      userId: string,
    ) {
      const exists = await this.repository.findByCode(
        companyId,
        dto.code,
      );

      if (exists) {
        throw new ConflictException(
          'Já existe um depósito com este código.',
        );
      }

      return this.repository.create(companyId, dto, userId);
    }

    async findAll(
      companyId: string,
      filter: WarehouseFilterDto,
    ) {
      const warehouses = await this.repository.findAll(companyId, filter);

      return attachAuditNames(this.prisma, warehouses);
    }

    async findOne(
      companyId: string,
      id: string,
    ) {
      const warehouse = await this.repository.findById(
        companyId,
        id,
      );

      if (!warehouse) {
        throw new NotFoundException(
          'Depósito não encontrado.',
        );
      }

      return attachAuditName(this.prisma, warehouse);
    }

    async update(
      companyId: string,
      id: string,
      dto: UpdateWarehouseDto,
      userId: string,
    ) {
      await this.findOne(companyId, id);

      return this.repository.update(
        companyId,
        id,
        dto,
        userId,
      );
    }

    async remove(
      companyId: string,
      id: string,
    ) {
      await this.findOne(companyId, id);

      return this.repository.remove(
        companyId,
        id,
      );
    }
  }