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
  
    async create(createProductDto: CreateProductDto) {
      const exists = await this.repository.findByCode(
        createProductDto.companyId,
        createProductDto.code,
      );
  
      if (exists) {
        throw new ConflictException(
          'Já existe um produto cadastrado com este código.',
        );
      }
  
      return this.repository.create(createProductDto);
    }
  
    async findAll(filter: ProductFilterDto) {
      return this.repository.findAll(filter);
    }
  
    async findOne(id: string) {
      const product = await this.repository.findById(id);
  
      if (!product) {
        throw new NotFoundException(
          'Produto não encontrado.',
        );
      }
  
      return product;
    }
  
    async update(
      id: string,
      updateProductDto: UpdateProductDto,
    ) {
      await this.findOne(id);
  
      return this.repository.update(
        id,
        updateProductDto,
      );
    }
  
    async remove(id: string) {
      await this.findOne(id);
  
      return this.repository.delete(id);
    }
  }