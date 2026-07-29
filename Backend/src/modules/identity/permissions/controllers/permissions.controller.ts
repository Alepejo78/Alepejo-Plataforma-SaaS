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
  
  import { PermissionsService } from '../services/permissions.service';
  
  import { CreatePermissionDto } from '../dto/create-permission.dto';
  import { UpdatePermissionDto } from '../dto/update-permission.dto';
  import { PermissionFilterDto } from '../dto/permission-filter.dto';
  
  @ApiTags('Identity - Permissions')
  @Controller('identity/permissions')
  export class PermissionsController {
    constructor(
      private readonly permissionsService: PermissionsService,
    ) {}
  
    @Post()
    @ApiOperation({
      summary: 'Criar Permission',
    })
    @ApiResponse({
      status: 201,
    })
    create(
      @Body() dto: CreatePermissionDto,
    ) {
      return this.permissionsService.create(dto);
    }
  
    @Get()
    @ApiOperation({
      summary: 'Listar Permissions',
    })
    findAll(
      @Query() filter: PermissionFilterDto,
    ) {
      return this.permissionsService.findAll(filter);
    }
  
    @Get(':id')
    @ApiOperation({
      summary: 'Buscar Permission',
    })
    findById(
      @Param('id') id: string,
    ) {
      return this.permissionsService.findById(id);
    }
  
    @Patch(':id')
    @ApiOperation({
      summary: 'Atualizar Permission',
    })
    update(
      @Param('id') id: string,
      @Body() dto: UpdatePermissionDto,
    ) {
      return this.permissionsService.update(
        id,
        dto,
      );
    }
  
    @Delete(':id')
    @ApiOperation({
      summary: 'Excluir Permission',
    })
    remove(
      @Param('id') id: string,
    ) {
      return this.permissionsService.remove(id);
    }
  }