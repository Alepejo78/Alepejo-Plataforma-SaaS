import {
    ConflictException,
    Injectable,
    NotFoundException,
  } from '@nestjs/common';

  import { PrismaService } from '../../../core/prisma/prisma.service';
  import { attachAuditNames, attachAuditName } from '../../../core/utils/audit-names.util';

  import { ProductsRepository } from '../repositories/products.repository';

  import { CreateProductDto } from '../dto/create-product.dto';
  import { UpdateProductDto } from '../dto/update-product.dto';
  import { ProductFilterDto } from '../dto/product-filter.dto';

  @Injectable()
  export class ProductsService {
    constructor(
      private readonly repository: ProductsRepository,
      private readonly prisma: PrismaService,
    ) {}

    async create(
      companyId: string,
      createProductDto: CreateProductDto,
      userId: string,
    ) {
      const exists = await this.repository.findByCode(
        companyId,
        createProductDto.code,
      );

      if (exists) {
        throw new ConflictException(
          'Já existe um produto cadastrado com este código.',
        );
      }

      return this.repository.create(companyId, createProductDto, userId);
    }

    async findAll(companyId: string, filter: ProductFilterDto) {
      const result = await this.repository.findAll(companyId, filter);

      return {
        ...result,
        data: await attachAuditNames(this.prisma, result.data),
      };
    }

    async findOne(companyId: string, id: string) {
      const product = await this.repository.findById(companyId, id);

      if (!product) {
        throw new NotFoundException(
          'Produto não encontrado.',
        );
      }

      return attachAuditName(this.prisma, product);
    }

    async update(
      companyId: string,
      id: string,
      updateProductDto: UpdateProductDto,
      userId: string,
    ) {
      await this.findOne(companyId, id);

      return this.repository.update(
        id,
        updateProductDto,
        userId,
      );
    }

    async remove(companyId: string, id: string) {
      await this.findOne(companyId, id);

      return this.repository.delete(id);
    }
  }
