import {
    BadRequestException,
    Injectable,
    NotFoundException,
  } from '@nestjs/common';

  import { SupplierRepository } from './repositories/supplier.repository';
  import { CreateSupplierDto } from './dto/create-supplier.dto';
  import { UpdateSupplierDto } from './dto/update-supplier.dto';
  import { FilterSupplierDto } from './dto/filter-supplier.dto';

  @Injectable()
  export class SuppliersService {
    constructor(private readonly repository: SupplierRepository) {}

    async create(companyId: string, dto: CreateSupplierDto) {
      const exists = await this.repository.findByDocument(
        companyId,
        dto.document,
      );

      if (exists) {
        throw new BadRequestException(
          'Já existe um fornecedor com este documento.',
        );
      }

      return this.repository.create({
        company: {
          connect: {
            id: companyId,
          },
        },
        ...dto,
      });
    }

    async findAll(companyId: string, filter: FilterSupplierDto) {
      const page = Number(filter.page ?? 1);
      const limit = Number(filter.limit ?? 20);

      const skip = (page - 1) * limit;

      const [items, total] = await Promise.all([
        this.repository.findAll(companyId, skip, limit, filter.search),
        this.repository.count(companyId, filter.search),
      ]);

      return {
        items,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      };
    }

    async findOne(companyId: string, id: string) {
      const supplier = await this.repository.findById(companyId, id);

      if (!supplier) {
        throw new NotFoundException('Fornecedor não encontrado.');
      }

      return supplier;
    }

    async update(companyId: string, id: string, dto: UpdateSupplierDto) {
      await this.findOne(companyId, id);

      return this.repository.update(id, dto);
    }

    async remove(companyId: string, id: string) {
      await this.findOne(companyId, id);

      return this.repository.delete(id);
    }
  }
