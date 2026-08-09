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
      companyId: string,
      createUnitOfMeasureDto: CreateUnitOfMeasureDto,
    ): Promise<UnitOfMeasure> {
      const codeExists =
        await this.unitsOfMeasureRepository.findByCode(
          companyId,
          createUnitOfMeasureDto.code,
        );

      if (codeExists?.active) {
        throw new BadRequestException(
          'Já existe uma unidade de medida cadastrada com este código.',
        );
      }

      const descriptionExists =
        await this.unitsOfMeasureRepository.findByDescription(
          companyId,
          createUnitOfMeasureDto.description,
        );

      if (
        descriptionExists?.active &&
        descriptionExists.id !== codeExists?.id
      ) {
        throw new BadRequestException(
          'Já existe uma unidade de medida cadastrada com esta descrição.',
        );
      }

      if (codeExists && !codeExists.active) {
        return this.unitsOfMeasureRepository.restore(
          codeExists.id,
          createUnitOfMeasureDto,
        );
      }

      return this.unitsOfMeasureRepository.create(
        companyId,
        createUnitOfMeasureDto,
      );
    }

    async findAll(companyId: string, filter: UnitOfMeasureFilterDto) {
      return this.unitsOfMeasureRepository.findAll(companyId, filter);
    }

    async findById(
      companyId: string,
      id: string,
    ): Promise<UnitOfMeasure> {
      const unit =
        await this.unitsOfMeasureRepository.findById(companyId, id);

      if (!unit) {
        throw new NotFoundException(
          'Unidade de medida não encontrada.',
        );
      }

      return unit;
    }

    async update(
      companyId: string,
      id: string,
      updateUnitOfMeasureDto: UpdateUnitOfMeasureDto,
    ): Promise<UnitOfMeasure> {
      await this.findById(companyId, id);

      if (updateUnitOfMeasureDto.code) {
        const codeExists =
          await this.unitsOfMeasureRepository.findByCode(
            companyId,
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

      if (updateUnitOfMeasureDto.description) {
        const descriptionExists =
          await this.unitsOfMeasureRepository.findByDescription(
            companyId,
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
      companyId: string,
      id: string,
    ): Promise<void> {
      await this.findById(companyId, id);

      const inUse =
        await this.unitsOfMeasureRepository.countProducts(id);

      if (inUse > 0) {
        throw new BadRequestException(
          'Esta unidade de medida está vinculada a produtos e não pode ser excluída.',
        );
      }

      await this.unitsOfMeasureRepository.delete(id);
    }
  }
