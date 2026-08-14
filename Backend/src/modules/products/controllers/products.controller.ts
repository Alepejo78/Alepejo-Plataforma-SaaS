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

import { Module } from '../../identity/license/decorators/module.decorator';
import { ERP_MODULES } from '../../identity/auth/constants/permissions.constants';

import { ProductsService } from '../services/products.service';

import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { ProductFilterDto } from '../dto/product-filter.dto';

/** Cadastro de grupo ("Interprise") — companyId aqui é sempre a raiz do grupo (rootCompanyId), ver WarehouseController. */
@Controller('products')
@Module(ERP_MODULES.PRODUCTS)
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
  ) {}

  @Post()
  @Permissions('product.create')
  create(
    @CurrentUser('rootCompanyId') companyId: string,
    @Body() createProductDto: CreateProductDto,
  ) {
    return this.productsService.create(
      companyId,
      createProductDto,
    );
  }

  @Get()
  @Permissions('product.view')
  findAll(
    @CurrentUser('rootCompanyId') companyId: string,
    @Query() filter: ProductFilterDto,
  ) {
    return this.productsService.findAll(
      companyId,
      filter,
    );
  }

  @Get(':id')
  @Permissions('product.view')
  findOne(
    @CurrentUser('rootCompanyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.productsService.findOne(
      companyId,
      id,
    );
  }

  @Patch(':id')
  @Permissions('product.update')
  update(
    @CurrentUser('rootCompanyId') companyId: string,
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productsService.update(
      companyId,
      id,
      updateProductDto,
    );
  }

  @Delete(':id')
  @Permissions('product.delete')
  remove(
    @CurrentUser('rootCompanyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.productsService.remove(
      companyId,
      id,
    );
  }
}