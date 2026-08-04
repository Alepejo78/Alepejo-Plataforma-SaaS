import {
    ConflictException,
    Injectable,
    NotFoundException,
  } from '@nestjs/common';

  import { ProductsRepository } from '../repositories/products.repository';

  import { CreateProductDto } from '../dto/create-product.dto';
  import { UpdateProductDto } from '../dto/update-product.dto';
  import { ProductFilterDto } from '../dto/product-filter.dto';

  @Injectable()
  export class ProductsService {
    constructor(
      private readonly repository: ProductsRepository,
    ) {}

    async create(companyId: string, createProductDto: CreateProductDto) {
      const exists = await this.repository.findByCode(
        companyId,
        createProductDto.code,
      );

      if (exists) {
        throw new ConflictException(
          'Já existe um produto cadastrado com este código.',
        );
      }

      return this.repository.create(companyId, createProductDto);
    }

    async findAll(companyId: string, filter: ProductFilterDto) {
      return this.repository.findAll(companyId, filter);
    }

    async findOne(companyId: string, id: string) {
      const product = await this.repository.findById(companyId, id);

      if (!product) {
        throw new NotFoundException(
          'Produto não encontrado.',
        );
      }

      return product;
    }

    async update(
      companyId: string,
      id: string,
      updateProductDto: UpdateProductDto,
    ) {
      await this.findOne(companyId, id);

      return this.repository.update(
        id,
        updateProductDto,
      );
    }

    async remove(companyId: string, id: string) {
      await this.findOne(companyId, id);

      return this.repository.delete(id);
    }
  }
