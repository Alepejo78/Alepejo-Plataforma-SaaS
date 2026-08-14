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

  import { CurrentUser } from '../../../core/decorators/current-user.decorator';
  import { Permissions } from '../../identity/auth/decorators/permissions.decorator';

  import { ProductCategoriesService } from '../services/product-categories.service';

  import { CreateProductCategoryDto } from '../dto/create-product-category.dto';
  import { UpdateProductCategoryDto } from '../dto/update-product-category.dto';
  import { ProductCategoryFilterDto } from '../dto/product-category-filter.dto';

  /** Cadastro de grupo ("Interprise") — companyId aqui é sempre a raiz do grupo (rootCompanyId), ver WarehouseController. */
  @Controller('product-categories')
  export class ProductCategoriesController {
    constructor(
      private readonly productCategoriesService: ProductCategoriesService,
    ) {}

    @Post()
    @Permissions('product-category.create')
    create(
      @CurrentUser('rootCompanyId') companyId: string,
      @Body() createProductCategoryDto: CreateProductCategoryDto,
    ) {
      return this.productCategoriesService.create(
        companyId,
        createProductCategoryDto,
      );
    }

    @Get()
    @Permissions('product-category.view')
    findAll(
      @CurrentUser('rootCompanyId') companyId: string,
      @Query() filter: ProductCategoryFilterDto,
    ) {
      return this.productCategoriesService.findAll(companyId, filter);
    }

    @Get(':id')
    @Permissions('product-category.view')
    findOne(
      @CurrentUser('rootCompanyId') companyId: string,
      @Param('id') id: string,
    ) {
      return this.productCategoriesService.findOne(companyId, id);
    }

    @Patch(':id')
    @Permissions('product-category.update')
    update(
      @CurrentUser('rootCompanyId') companyId: string,
      @Param('id') id: string,
      @Body() updateProductCategoryDto: UpdateProductCategoryDto,
    ) {
      return this.productCategoriesService.update(
        companyId,
        id,
        updateProductCategoryDto,
      );
    }

    @Delete(':id')
    @Permissions('product-category.delete')
    remove(
      @CurrentUser('rootCompanyId') companyId: string,
      @Param('id') id: string,
    ) {
      return this.productCategoriesService.remove(companyId, id);
    }
  }
