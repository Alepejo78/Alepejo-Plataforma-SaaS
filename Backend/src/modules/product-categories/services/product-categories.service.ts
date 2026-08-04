import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { ProductCategoriesRepository } from '../repositories/product-categories.repository';

import { CreateProductCategoryDto } from '../dto/create-product-category.dto';
import { UpdateProductCategoryDto } from '../dto/update-product-category.dto';
import { ProductCategoryFilterDto } from '../dto/product-category-filter.dto';

@Injectable()
export class ProductCategoriesService {
  constructor(
    private readonly repository: ProductCategoriesRepository,
  ) {}

  async create(
    companyId: string,
    createProductCategoryDto: CreateProductCategoryDto,
  ) {
    const exists = await this.repository.findByName(
      companyId,
      createProductCategoryDto.name,
    );

    if (exists) {
      throw new ConflictException(
        'Já existe uma categoria com este nome.',
      );
    }

    return this.repository.create(companyId, createProductCategoryDto);
  }

  async findAll(companyId: string, filter: ProductCategoryFilterDto) {
    return this.repository.findAll(companyId, filter);
  }

  async findOne(companyId: string, id: string) {
    const category = await this.repository.findById(companyId, id);

    if (!category) {
      throw new NotFoundException(
        'Categoria de produto não encontrada.',
      );
    }

    return category;
  }

  async update(
    companyId: string,
    id: string,
    updateProductCategoryDto: UpdateProductCategoryDto,
  ) {
    await this.findOne(companyId, id);

    return this.repository.update(
      id,
      updateProductCategoryDto,
    );
  }

  async remove(companyId: string, id: string) {
    await this.findOne(companyId, id);

    return this.repository.delete(id);
  }
}
