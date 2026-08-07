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

  import { CurrentUser } from '../../../../core/decorators/current-user.decorator';
  import { Permissions } from '../../auth/decorators/permissions.decorator';

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
    @Permissions('role-permission.manage')
    @ApiOperation({
      summary: 'Vincular permissão ao papel',
    })
    assign(
      @CurrentUser('companyId') companyId: string,
      @Body() dto: AssignRolePermissionDto,
    ) {
      return this.service.assign(companyId, dto);
    }

    @Get()
    @Permissions('role-permission.view')
    @ApiOperation({
      summary: 'Listar vínculos',
    })
    findAll(
      @CurrentUser('companyId') companyId: string,
      @Query() filter: RolePermissionFilterDto,
    ) {
      return this.service.findAll(companyId, filter);
    }

    @Get(':id')
    @Permissions('role-permission.view')
    @ApiOperation({
      summary: 'Buscar vínculo por ID',
    })
    findById(
      @CurrentUser('companyId') companyId: string,
      @Param('id') id: string,
    ) {
      return this.service.findById(companyId, id);
    }

    @Patch(':id/effect')
    @Permissions('role-permission.manage')
    @ApiOperation({
      summary: 'Alterar efeito da permissão',
    })
    updateEffect(
      @CurrentUser('companyId') companyId: string,
      @Param('id') id: string,
      @Body('effect') effect: PermissionEffect,
    ) {
      return this.service.updateEffect(
        companyId,
        id,
        effect,
      );
    }

    @Delete(':id')
    @Permissions('role-permission.manage')
    @ApiOperation({
      summary: 'Remover vínculo',
    })
    remove(
      @CurrentUser('companyId') companyId: string,
      @Param('id') id: string,
    ) {
      return this.service.remove(companyId, id);
    }
  }
