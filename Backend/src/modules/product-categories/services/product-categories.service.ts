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
    createProductCategoryDto: CreateProductCategoryDto,
  ) {
    const exists = await this.repository.findByName(
      createProductCategoryDto.companyId,
      createProductCategoryDto.name,
    );

    if (exists) {
      throw new ConflictException(
        'Já existe uma categoria com este nome.',
      );
    }

    return this.repository.create(createProductCategoryDto);
  }

  async findAll(filter: ProductCategoryFilterDto) {
    return this.repository.findAll(filter);
  }

  async findOne(id: string) {
    const category = await this.repository.findById(id);

    if (!category) {
      throw new NotFoundException(
        'Categoria de produto não encontrada.',
      );
    }

    return category;
  }

  async update(
    id: string,
    updateProductCategoryDto: UpdateProductCategoryDto,
  ) {
    await this.findOne(id);

    return this.repository.update(
      id,
      updateProductCategoryDto,
    );
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.repository.delete(id);
  }
}