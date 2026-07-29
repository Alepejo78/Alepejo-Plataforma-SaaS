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
  
  import { SuppliersService } from './suppliers.service';
  import { CreateSupplierDto } from './dto/create-supplier.dto';
  import { UpdateSupplierDto } from './dto/update-supplier.dto';
  import { FilterSupplierDto } from './dto/filter-supplier.dto';
  
  @Controller('suppliers')
  export class SuppliersController {
    constructor(private readonly service: SuppliersService) {}
  
    @Post(':companyId')
    create(
      @Param('companyId') companyId: string,
      @Body() dto: CreateSupplierDto,
    ) {
      return this.service.create(companyId, dto);
    }
  
    @Get(':companyId')
    findAll(
      @Param('companyId') companyId: string,
      @Query() filter: FilterSupplierDto,
    ) {
      return this.service.findAll(companyId, filter);
    }
  
    @Get('details/:id')
    findOne(@Param('id') id: string) {
      return this.service.findOne(id);
    }
  
    @Patch(':id')
    update(
      @Param('id') id: string,
      @Body() dto: UpdateSupplierDto,
    ) {
      return this.service.update(id, dto);
    }
  
    @Delete(':id')
    remove(@Param('id') id: string) {
      return this.service.remove(id);
    }
  }