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
    async create(
      @Body() createBrandDto: CreateBrandDto,
    ) {
      return this.brandsService.create(createBrandDto);
    }
  
    @Get()
    async findAll(
      @Query() filter: BrandFilterDto,
    ) {
      return this.brandsService.findAll(filter);
    }
  
    @Get(':id')
    async findById(
      @Param('id') id: string,
    ) {
      return this.brandsService.findById(id);
    }
  
    @Patch(':id')
    async update(
      @Param('id') id: string,
      @Body() updateBrandDto: UpdateBrandDto,
    ) {
      return this.brandsService.update(
        id,
        updateBrandDto,
      );
    }
  
    @Delete(':id')
    async remove(
      @Param('id') id: string,
    ) {
      await this.brandsService.remove(id);
  
      return {
        success: true,
        message: 'Marca removida com sucesso.',
      };
    }
  }