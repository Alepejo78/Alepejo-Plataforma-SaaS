import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { ApiConsumes, ApiOperation } from '@nestjs/swagger';

import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { Permissions } from '../../identity/auth/decorators/permissions.decorator';
import { Module } from '../../identity/license/decorators/module.decorator';

import { EmployeesService } from '../services/employees.service';
import {
  EmployeePhotoService,
  employeePhotoDestination,
  employeePhotoFileFilter,
  employeePhotoFilename,
} from '../services/employee-photo.service';

import { CreateEmployeeDto } from '../dto/create-employee.dto';
import { UpdateEmployeeDto } from '../dto/update-employee.dto';
import { EmployeeFilterDto } from '../dto/employee-filter.dto';

@Controller('employees')
@Module('HR')
export class EmployeesController {
  constructor(
    private readonly service: EmployeesService,
    private readonly photoService: EmployeePhotoService,
  ) {}

  @Post()
  @Permissions('employee.create')
  create(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('rootCompanyId') rootCompanyId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateEmployeeDto,
  ) {
    return this.service.create(companyId, rootCompanyId, dto, userId);
  }

  @Get()
  @Permissions('employee.view')
  findAll(
    @CurrentUser('companyId') companyId: string,
    @Query() filter: EmployeeFilterDto,
  ) {
    return this.service.findAll(companyId, filter);
  }

  @Get('reports/birthdays')
  @Permissions('employee.view')
  getBirthdays(
    @CurrentUser('companyId') companyId: string,
    @Query('month') month?: string,
  ) {
    return this.service.getBirthdays(
      companyId,
      month ? Number(month) : undefined,
    );
  }

  @Get('reports/indicators')
  @Permissions('employee.view')
  getIndicators(@CurrentUser('companyId') companyId: string) {
    return this.service.getIndicators(companyId);
  }

  @Get('me')
  findMine(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.findMine(companyId, userId);
  }

  /** Colaboradores de todas as empresas do grupo — tela "Interprise → Colaboradores". */
  @Get('group')
  @Permissions('employee.view')
  findAllInGroup(
    @CurrentUser('rootCompanyId') rootCompanyId: string,
    @Query() filter: EmployeeFilterDto,
  ) {
    return this.service.findAllInGroup(rootCompanyId, filter);
  }

  @Get(':id')
  @Permissions('employee.view')
  findOne(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.findOne(companyId, id);
  }

  @Patch(':id')
  @Permissions('employee.update')
  update(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return this.service.update(companyId, id, dto);
  }

  @Delete(':id')
  @Permissions('employee.delete')
  remove(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.remove(companyId, id);
  }

  @Post(':id/photo')
  @Permissions('employee.update')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Enviar foto do colaborador' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: employeePhotoDestination,
        filename: employeePhotoFilename,
      }),
      fileFilter: employeePhotoFileFilter,
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  uploadPhoto(
    @CurrentUser('rootCompanyId') rootCompanyId: string,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.photoService.uploadPhoto(rootCompanyId, id, file);
  }
}
