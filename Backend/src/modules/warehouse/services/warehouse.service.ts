import {
    ConflictException,
    Injectable,
    NotFoundException,
  } from '@nestjs/common';
  import { Warehouse } from '@prisma/client';
  import { CreateWarehouseDto } from '../dto/create-warehouse.dto';
  import { UpdateWarehouseDto } from '../dto/update-warehouse.dto';
  import { WarehouseFilterDto } from '../dto/warehouse-filter.dto';
  import { WarehouseRepository } from '../repositories/warehouse.repository';
  
  @Injectable()
  export class WarehouseService {
    constructor(
      private readonly repository: WarehouseRepository,
    ) {}
  
    async create(
      companyId: string,
      dto: CreateWarehouseDto,
    ): Promise<Warehouse> {
      const exists = await this.repository.findByCode(
        companyId,
        dto.code,
      );
  
      if (exists) {
        throw new ConflictException(
          'Já existe um depósito com este código.',
        );
      }
  
      return this.repository.create(companyId, dto);
    }
  
    async findAll(
      companyId: string,
      filter: WarehouseFilterDto,
    ): Promise<Warehouse[]> {
      return this.repository.findAll(companyId, filter);
    }
  
    async findOne(
      companyId: string,
      id: string,
    ): Promise<Warehouse> {
      const warehouse = await this.repository.findById(
        companyId,
        id,
      );
  
      if (!warehouse) {
        throw new NotFoundException(
          'Depósito não encontrado.',
        );
      }
  
      return warehouse;
    }
  
    async update(
      companyId: string,
      id: string,
      dto: UpdateWarehouseDto,
    ): Promise<Warehouse> {
      await this.findOne(companyId, id);
  
      return this.repository.update(
        companyId,
        id,
        dto,
      );
    }
  
    async remove(
      companyId: string,
      id: string,
    ): Promise<Warehouse> {
      await this.findOne(companyId, id);
  
      return this.repository.remove(
        companyId,
        id,
      );
    }
  }