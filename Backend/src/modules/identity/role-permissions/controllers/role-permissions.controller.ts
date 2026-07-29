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
    ApiTags,
  } from '@nestjs/swagger';
  import { PermissionEffect } from '@prisma/client';
  
  import { AssignRolePermissionDto } from '../dto/assign-role-permission.dto';
  import { RolePermissionFilterDto } from '../dto/role-permission-filter.dto';
  import { RolePermissionsService } from '../services/role-permissions.service';
  
  @ApiTags('Role Permissions')
  @Controller('identity/role-permissions')
  export class RolePermissionsController {
    constructor(
      private readonly service: RolePermissionsService,
    ) {}
  
    @Post()
    @ApiOperation({
      summary: 'Vincular permissão ao papel',
    })
    assign(
      @Body() dto: AssignRolePermissionDto,
    ) {
      return this.service.assign(dto);
    }
  
    @Get()
    @ApiOperation({
      summary: 'Listar vínculos',
    })
    findAll(
      @Query() filter: RolePermissionFilterDto,
    ) {
      return this.service.findAll(filter);
    }
  
    @Get(':id')
    @ApiOperation({
      summary: 'Buscar vínculo por ID',
    })
    findById(
      @Param('id') id: string,
    ) {
      return this.service.findById(id);
    }
  
    @Patch(':id/effect')
    @ApiOperation({
      summary: 'Alterar efeito da permissão',
    })
    updateEffect(
      @Param('id') id: string,
      @Body('effect') effect: PermissionEffect,
    ) {
      return this.service.updateEffect(
        id,
        effect,
      );
    }
  
    @Delete(':id')
    @ApiOperation({
      summary: 'Remover vínculo',
    })
    remove(
      @Param('id') id: string,
    ) {
      return this.service.remove(id);
    }
  }