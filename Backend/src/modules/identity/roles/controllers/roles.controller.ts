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
  
  import { RolesService } from '../services/roles.service';
  
  import { CreateRoleDto } from '../dto/create-role.dto';
  import { UpdateRoleDto } from '../dto/update-role.dto';
  import { RoleFilterDto } from '../dto/role-filter.dto';
  
  @ApiTags('Roles')
  @Controller('identity/roles')
  export class RolesController {
    constructor(
      private readonly service: RolesService,
    ) {}
  
    @Post()
    @ApiOperation({
      summary: 'Cadastrar Role',
    })
    @ApiResponse({
      status: 201,
    })
    async create(
      @Body() dto: CreateRoleDto,
    ) {
      return this.service.create(
        dto,
        'COMPANY_ID',
        'USER_ID',
      );
    }
  
    @Get()
    @ApiOperation({
      summary: 'Listar Roles',
    })
    async findAll(
      @Query() filter: RoleFilterDto,
    ) {
      return this.service.findAll(
        filter,
        'COMPANY_ID',
      );
    }
  
    @Get(':id')
    @ApiOperation({
      summary: 'Buscar Role',
    })
    async findOne(
      @Param('id') id: string,
    ) {
      return this.service.findById(
        id,
        'COMPANY_ID',
      );
    }
  
    @Patch(':id')
    @ApiOperation({
      summary: 'Atualizar Role',
    })
    async update(
      @Param('id') id: string,
      @Body() dto: UpdateRoleDto,
    ) {
      return this.service.update(
        id,
        dto,
        'COMPANY_ID',
        'USER_ID',
      );
    }
  
    @Delete(':id')
    @ApiOperation({
      summary: 'Excluir Role',
    })
    async remove(
      @Param('id') id: string,
    ) {
      return this.service.remove(
        id,
        'COMPANY_ID',
      );
    }
  }