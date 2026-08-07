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

  import { Permissions } from '../../auth/decorators/permissions.decorator';

  import { PermissionsService } from '../services/permissions.service';

  import { CreatePermissionDto } from '../dto/create-permission.dto';
  import { UpdatePermissionDto } from '../dto/update-permission.dto';
  import { PermissionFilterDto } from '../dto/permission-filter.dto';

  /**
   * Catálogo global de permissões do sistema (não é escopado por empresa).
   * A mutação é sensível: qualquer código criado aqui pode ser concedido
   * a uma Role. Reservado para administração da plataforma.
   */
  @ApiTags('Identity - Permissions')
  @Controller('identity/permissions')
  export class PermissionsController {
    constructor(
      private readonly permissionsService: PermissionsService,
    ) {}

    @Post()
    @Permissions('platform.permission.manage')
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
    @Permissions('permission.view')
    @ApiOperation({
      summary: 'Listar Permissions',
    })
    findAll(
      @Query() filter: PermissionFilterDto,
    ) {
      return this.permissionsService.findAll(filter);
    }

    @Get(':id')
    @Permissions('permission.view')
    @ApiOperation({
      summary: 'Buscar Permission',
    })
    findById(
      @Param('id') id: string,
    ) {
      return this.permissionsService.findById(id);
    }

    @Patch(':id')
    @Permissions('platform.permission.manage')
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
    @Permissions('platform.permission.manage')
    @ApiOperation({
      summary: 'Excluir Permission',
    })
    remove(
      @Param('id') id: string,
    ) {
      return this.permissionsService.remove(id);
    }
  }
