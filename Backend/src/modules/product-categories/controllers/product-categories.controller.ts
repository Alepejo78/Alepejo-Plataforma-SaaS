import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
  } from '@nestjs/common';
  
  import { ProductCategoriesService } from '../services/product-categories.service';
  
  import { CreateProductCategoryDto } from '../dto/create-product-category.dto';
  import { UpdateProductCategoryDto } from '../dto/update-product-category.dto';
  import { ProductCategoryFilterDto } from '../dto/product-category-filter.dto';
  
  @Controller('product-categories')
  export class ProductCategoriesController {
    constructor(
      private readonly productCategoriesService: ProductCategoriesService,
    ) {}
  
    @Post()
    create(
      @Body() createProductCategoryDto: CreateProductCategoryDto,
    ) {
      return this.productCategoriesService.create(
        createProductCategoryDto,
      );
    }
  
    @Get()
    findAll(
      @Query() filter: ProductCategoryFilterDto,
    ) {
      return this.productCategoriesService.findAll(filter);
    }
  
    @Get(':id')
    findOne(
      @Param('id') id: string,
    ) {
      return this.productCategoriesService.findOne(id);
    }
  
    @Patch(':id')
    update(
      @Param('id') id: string,
      @Body() updateProductCategoryDto: UpdateProductCategoryDto,
    ) {
      return this.productCategoriesService.update(
        id,
        updateProductCategoryDto,
      );
    }
  
    @Delete(':id')
    remove(
      @Param('id') id: string,
    ) {
      return this.productCategoriesService.remove(id);
    }
  }