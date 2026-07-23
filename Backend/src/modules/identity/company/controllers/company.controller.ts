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

import {
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { PaginationDto } from '../../../../core/dto/pagination.dto';

import { CompanyService } from '../services/company.service';

import { CreateCompanyDto } from '../dto/create-company.dto';
import { UpdateCompanyDto } from '../dto/update-company.dto';

@ApiTags('Companies')
@Controller('companies')
export class CompanyController {
  constructor(
    private readonly companyService: CompanyService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Cadastrar empresa' })
  @ApiResponse({
    status: 201,
    description: 'Empresa cadastrada com sucesso.',
  })
  @ApiResponse({
    status: 409,
    description: 'Documento já cadastrado.',
  })
  create(@Body() dto: CreateCompanyDto) {
    return this.companyService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar empresas' })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de empresas.',
  })
  findAll(
    @Query() pagination: PaginationDto,
  ) {
    return this.companyService.findAll(
      pagination.page,
      pagination.limit,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar empresa por ID' })
  @ApiResponse({
    status: 200,
    description: 'Empresa encontrada.',
  })
  @ApiResponse({
    status: 404,
    description: 'Empresa não encontrada.',
  })
  findById(
    @Param('id') id: string,
  ) {
    return this.companyService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar empresa' })
  @ApiResponse({
    status: 200,
    description: 'Empresa atualizada.',
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.companyService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Excluir empresa (Soft Delete)',
  })
  @ApiResponse({
    status: 200,
    description: 'Empresa excluída.',
  })
  remove(
    @Param('id') id: string,
  ) {
    return this.companyService.remove(id);
  }
}