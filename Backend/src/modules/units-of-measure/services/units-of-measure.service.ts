import {
    BadRequestException,
    Injectable,
    NotFoundException,
  } from '@nestjs/common';
  
  import { UnitOfMeasure } from '@prisma/client';
  
  import { UnitsOfMeasureRepository } from '../repositories/units-of-measure.repository';
  
  import { CreateUnitOfMeasureDto } from '../dto/create-unit-of-measure.dto';
  import { UpdateUnitOfMeasureDto } from '../dto/update-unit-of-measure.dto';
  import { UnitOfMeasureFilterDto } from '../dto/unit-of-measure-filter.dto';
  
  @Injectable()
  export class UnitsOfMeasureService {
    constructor(
      private readonly unitsOfMeasureRepository: UnitsOfMeasureRepository,
    ) {}
  
    async create(
      createUnitOfMeasureDto: CreateUnitOfMeasureDto,
    ): Promise<UnitOfMeasure> {
      const codeExists =
        await this.unitsOfMeasureRepository.findByCode(
          createUnitOfMeasureDto.companyId,
          createUnitOfMeasureDto.code,
        );
  
      if (codeExists) {
        throw new BadRequestException(
          'Já existe uma unidade de medida cadastrada com este código.',
        );
      }
  
      const descriptionExists =
        await this.unitsOfMeasureRepository.findByDescription(
          createUnitOfMeasureDto.companyId,
          createUnitOfMeasureDto.description,
        );
  
      if (descriptionExists) {
        throw new BadRequestException(
          'Já existe uma unidade de medida cadastrada com esta descrição.',
        );
      }
  
      return this.unitsOfMeasureRepository.create(
        createUnitOfMeasureDto,
      );
    }
  
    async findAll(filter: UnitOfMeasureFilterDto) {
      return this.unitsOfMeasureRepository.findAll(filter);
    }
  
    async findById(
      id: string,
    ): Promise<UnitOfMeasure> {
      const unit =
        await this.unitsOfMeasureRepository.findById(id);
  
      if (!unit) {
        throw new NotFoundException(
          'Unidade de medida não encontrada.',
        );
      }
  
      return unit;
    }
  
    async update(
      id: string,
      updateUnitOfMeasureDto: UpdateUnitOfMeasureDto,
    ): Promise<UnitOfMeasure> {
      await this.findById(id);
  
      if (
        updateUnitOfMeasureDto.companyId &&
        updateUnitOfMeasureDto.code
      ) {
        const codeExists =
          await this.unitsOfMeasureRepository.findByCode(
            updateUnitOfMeasureDto.companyId,
            updateUnitOfMeasureDto.code,
          );
  
        if (
          codeExists &&
          codeExists.id !== id
        ) {
          throw new BadRequestException(
            'Já existe uma unidade de medida cadastrada com este código.',
          );
        }
      }
  
      if (
        updateUnitOfMeasureDto.companyId &&
        updateUnitOfMeasureDto.description
      ) {
        const descriptionExists =
          await this.unitsOfMeasureRepository.findByDescription(
            updateUnitOfMeasureDto.companyId,
            updateUnitOfMeasureDto.description,
          );
  
        if (
          descriptionExists &&
          descriptionExists.id !== id
        ) {
          throw new BadRequestException(
            'Já existe uma unidade de medida cadastrada com esta descrição.',
          );
        }
      }
  
      return this.unitsOfMeasureRepository.update(
        id,
        updateUnitOfMeasureDto,
      );
    }
  
    async remove(
      id: string,
    ): Promise<void> {
      await this.findById(id);
  
      await this.unitsOfMeasureRepository.delete(id);
    }
  }