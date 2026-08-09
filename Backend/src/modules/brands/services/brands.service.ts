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
      companyId: string,
      createBrandDto: CreateBrandDto,
    ): Promise<Brand> {
      const exists = await this.brandsRepository.findByName(
        companyId,
        createBrandDto.name,
      );

      if (exists) {
        if (exists.active) {
          throw new BadRequestException(
            'Já existe uma marca cadastrada com este nome.',
          );
        }

        return this.brandsRepository.restore(
          exists.id,
          createBrandDto,
        );
      }

      return this.brandsRepository.create(companyId, createBrandDto);
    }

    async findAll(companyId: string, filter: BrandFilterDto) {
      return this.brandsRepository.findAll(companyId, filter);
    }

    async findById(companyId: string, id: string): Promise<Brand> {
      const brand = await this.brandsRepository.findById(companyId, id);

      if (!brand) {
        throw new NotFoundException(
          'Marca não encontrada.',
        );
      }

      return brand;
    }

    async update(
      companyId: string,
      id: string,
      updateBrandDto: UpdateBrandDto,
    ): Promise<Brand> {
      await this.findById(companyId, id);

      if (updateBrandDto.name) {
        const exists = await this.brandsRepository.findByName(
          companyId,
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

    async remove(companyId: string, id: string): Promise<void> {
      await this.findById(companyId, id);

      const inUse = await this.brandsRepository.countProducts(id);

      if (inUse > 0) {
        throw new BadRequestException(
          'Esta marca está vinculada a produtos e não pode ser excluída.',
        );
      }

      await this.brandsRepository.delete(id);
    }
  }
