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

  import { CurrentUser } from '../../core/decorators/current-user.decorator';
  import { Permissions } from '../identity/auth/decorators/permissions.decorator';

  import { SuppliersService } from './suppliers.service';
  import { CreateSupplierDto } from './dto/create-supplier.dto';
  import { UpdateSupplierDto } from './dto/update-supplier.dto';
  import { FilterSupplierDto } from './dto/filter-supplier.dto';

  @Controller('suppliers')
  export class SuppliersController {
    constructor(private readonly service: SuppliersService) {}

    @Post()
    @Permissions('supplier.create')
    create(
      @CurrentUser('companyId') companyId: string,
      @Body() dto: CreateSupplierDto,
    ) {
      return this.service.create(companyId, dto);
    }

    @Get()
    @Permissions('supplier.view')
    findAll(
      @CurrentUser('companyId') companyId: string,
      @Query() filter: FilterSupplierDto,
    ) {
      return this.service.findAll(companyId, filter);
    }

    @Get(':id')
    @Permissions('supplier.view')
    findOne(
      @CurrentUser('companyId') companyId: string,
      @Param('id') id: string,
    ) {
      return this.service.findOne(companyId, id);
    }

    @Patch(':id')
    @Permissions('supplier.update')
    update(
      @CurrentUser('companyId') companyId: string,
      @Param('id') id: string,
      @Body() dto: UpdateSupplierDto,
    ) {
      return this.service.update(companyId, id, dto);
    }

    @Delete(':id')
    @Permissions('supplier.delete')
    remove(
      @CurrentUser('companyId') companyId: string,
      @Param('id') id: string,
    ) {
      return this.service.remove(companyId, id);
    }
  }
