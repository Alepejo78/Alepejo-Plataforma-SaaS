import {
    BadRequestException,
    Injectable,
    NotFoundException,
  } from '@nestjs/common';
  
  import { Brand } from '@prisma/client';
  
  import { BrandsRepository } from '../repositories/brands.repository';
  
  import { CreateBrandDto } from '../dto/create-brand.dto';
  import { UpdateBrandDto } from '../dto/update-brand.dto';
  import { BrandFilterDto } from '../dto/brand-filter.dto';
  
  @Injectable()
  export class BrandsService {
    constructor(
      private readonly brandsRepository: BrandsRepository,
    ) {}
  
    async create(
      createBrandDto: CreateBrandDto,
    ): Promise<Brand> {
      const exists = await this.brandsRepository.findByName(
        createBrandDto.companyId,
        createBrandDto.name,
      );
  
      if (exists) {
        throw new BadRequestException(
          'Já existe uma marca cadastrada com este nome.',
        );
      }
  
      return this.brandsRepository.create(createBrandDto);
    }
  
    async findAll(filter: BrandFilterDto) {
      return this.brandsRepository.findAll(filter);
    }
  
    async findById(id: string): Promise<Brand> {
      const brand = await this.brandsRepository.findById(id);
  
      if (!brand) {
        throw new NotFoundException(
          'Marca não encontrada.',
        );
      }
  
      return brand;
    }
  
    async update(
      id: string,
      updateBrandDto: UpdateBrandDto,
    ): Promise<Brand> {
      await this.findById(id);
  
      if (
        updateBrandDto.companyId &&
        updateBrandDto.name
      ) {
        const exists = await this.brandsRepository.findByName(
          updateBrandDto.companyId,
          updateBrandDto.name,
        );
  
        if (exists && exists.id !== id) {
          throw new BadRequestException(
            'Já existe uma marca cadastrada com este nome.',
          );
        }
      }
  
      return this.brandsRepository.update(
        id,
        updateBrandDto,
      );
    }
  
    async remove(id: string): Promise<void> {
      await this.findById(id);
  
      await this.brandsRepository.delete(id);
    }
  }