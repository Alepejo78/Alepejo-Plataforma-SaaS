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

  import { UnitsOfMeasureService } from '../services/units-of-measure.service';

  import { CreateUnitOfMeasureDto } from '../dto/create-unit-of-measure.dto';
  import { UpdateUnitOfMeasureDto } from '../dto/update-unit-of-measure.dto';
  import { UnitOfMeasureFilterDto } from '../dto/unit-of-measure-filter.dto';

  /** Cadastro de grupo ("Interprise") — companyId aqui é sempre a raiz do grupo (rootCompanyId), ver WarehouseController. */
  @Controller('units-of-measure')
  export class UnitsOfMeasureController {
    constructor(
      private readonly unitsOfMeasureService: UnitsOfMeasureService,
    ) {}

    @Post()
    @Permissions('unit-of-measure.create')
    async create(
      @CurrentUser('rootCompanyId') companyId: string,
      @Body()
      createUnitOfMeasureDto: CreateUnitOfMeasureDto,
    ) {
      return this.unitsOfMeasureService.create(
        companyId,
        createUnitOfMeasureDto,
      );
    }

    @Get()
    @Permissions('unit-of-measure.view')
    async findAll(
      @CurrentUser('rootCompanyId') companyId: string,
      @Query()
      filter: UnitOfMeasureFilterDto,
    ) {
      return this.unitsOfMeasureService.findAll(
        companyId,
        filter,
      );
    }

    @Get(':id')
    @Permissions('unit-of-measure.view')
    async findById(
      @CurrentUser('rootCompanyId') companyId: string,
      @Param('id')
      id: string,
    ) {
      return this.unitsOfMeasureService.findById(
        companyId,
        id,
      );
    }

    @Patch(':id')
    @Permissions('unit-of-measure.update')
    async update(
      @CurrentUser('rootCompanyId') companyId: string,
      @Param('id')
      id: string,

      @Body()
      updateUnitOfMeasureDto: UpdateUnitOfMeasureDto,
    ) {
      return this.unitsOfMeasureService.update(
        companyId,
        id,
        updateUnitOfMeasureDto,
      );
    }

    @Delete(':id')
    @Permissions('unit-of-measure.delete')
    async remove(
      @CurrentUser('rootCompanyId') companyId: string,
      @Param('id')
      id: string,
    ) {
      await this.unitsOfMeasureService.remove(companyId, id);

      return {
        success: true,
        message:
          'Unidade de medida removida com sucesso.',
      };
    }
  }
