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
  
  import { UnitsOfMeasureService } from '../services/units-of-measure.service';
  
  import { CreateUnitOfMeasureDto } from '../dto/create-unit-of-measure.dto';
  import { UpdateUnitOfMeasureDto } from '../dto/update-unit-of-measure.dto';
  import { UnitOfMeasureFilterDto } from '../dto/unit-of-measure-filter.dto';
  
  @Controller('units-of-measure')
  export class UnitsOfMeasureController {
    constructor(
      private readonly unitsOfMeasureService: UnitsOfMeasureService,
    ) {}
  
    @Post()
    async create(
      @Body()
      createUnitOfMeasureDto: CreateUnitOfMeasureDto,
    ) {
      return this.unitsOfMeasureService.create(
        createUnitOfMeasureDto,
      );
    }
  
    @Get()
    async findAll(
      @Query()
      filter: UnitOfMeasureFilterDto,
    ) {
      return this.unitsOfMeasureService.findAll(
        filter,
      );
    }
  
    @Get(':id')
    async findById(
      @Param('id')
      id: string,
    ) {
      return this.unitsOfMeasureService.findById(
        id,
      );
    }
  
    @Patch(':id')
    async update(
      @Param('id')
      id: string,
  
      @Body()
      updateUnitOfMeasureDto: UpdateUnitOfMeasureDto,
    ) {
      return this.unitsOfMeasureService.update(
        id,
        updateUnitOfMeasureDto,
      );
    }
  
    @Delete(':id')
    async remove(
      @Param('id')
      id: string,
    ) {
      await this.unitsOfMeasureService.remove(id);
  
      return {
        success: true,
        message:
          'Unidade de medida removida com sucesso.',
      };
    }
  }