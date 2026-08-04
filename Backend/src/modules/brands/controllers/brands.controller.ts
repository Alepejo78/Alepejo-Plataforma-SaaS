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

  import { BrandsService } from '../services/brands.service';

  import { CreateBrandDto } from '../dto/create-brand.dto';
  import { UpdateBrandDto } from '../dto/update-brand.dto';
  import { BrandFilterDto } from '../dto/brand-filter.dto';

  @Controller('brands')
  export class BrandsController {
    constructor(
      private readonly brandsService: BrandsService,
    ) {}

    @Post()
    @Permissions('brand.create')
    async create(
      @CurrentUser('companyId') companyId: string,
      @Body() createBrandDto: CreateBrandDto,
    ) {
      return this.brandsService.create(companyId, createBrandDto);
    }

    @Get()
    @Permissions('brand.view')
    async findAll(
      @CurrentUser('companyId') companyId: string,
      @Query() filter: BrandFilterDto,
    ) {
      return this.brandsService.findAll(companyId, filter);
    }

    @Get(':id')
    @Permissions('brand.view')
    async findById(
      @CurrentUser('companyId') companyId: string,
      @Param('id') id: string,
    ) {
      return this.brandsService.findById(companyId, id);
    }

    @Patch(':id')
    @Permissions('brand.update')
    async update(
      @CurrentUser('companyId') companyId: string,
      @Param('id') id: string,
      @Body() updateBrandDto: UpdateBrandDto,
    ) {
      return this.brandsService.update(
        companyId,
        id,
        updateBrandDto,
      );
    }

    @Delete(':id')
    @Permissions('brand.delete')
    async remove(
      @CurrentUser('companyId') companyId: string,
      @Param('id') id: string,
    ) {
      await this.brandsService.remove(companyId, id);

      return {
        success: true,
        message: 'Marca removida com sucesso.',
      };
    }
  }
