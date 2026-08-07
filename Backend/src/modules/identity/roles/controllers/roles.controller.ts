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

  import { CurrentUser } from '../../../../core/decorators/current-user.decorator';
  import { Permissions } from '../../auth/decorators/permissions.decorator';

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
    @Permissions('role.create')
    @ApiOperation({
      summary: 'Cadastrar Role',
    })
    @ApiResponse({
      status: 201,
    })
    async create(
      @CurrentUser('companyId') companyId: string,
      @Body() dto: CreateRoleDto,
    ) {
      return this.service.create(dto, companyId);
    }

    @Get()
    @Permissions('role.view')
    @ApiOperation({
      summary: 'Listar Roles',
    })
    async findAll(
      @CurrentUser('companyId') companyId: string,
      @Query() filter: RoleFilterDto,
    ) {
      return this.service.findAll(filter, companyId);
    }

    @Get(':id')
    @Permissions('role.view')
    @ApiOperation({
      summary: 'Buscar Role',
    })
    async findOne(
      @CurrentUser('companyId') companyId: string,
      @Param('id') id: string,
    ) {
      return this.service.findById(id, companyId);
    }

    @Patch(':id')
    @Permissions('role.update')
    @ApiOperation({
      summary: 'Atualizar Role',
    })
    async update(
      @CurrentUser('companyId') companyId: string,
      @Param('id') id: string,
      @Body() dto: UpdateRoleDto,
    ) {
      return this.service.update(id, dto, companyId);
    }

    @Delete(':id')
    @Permissions('role.delete')
    @ApiOperation({
      summary: 'Excluir Role',
    })
    async remove(
      @CurrentUser('companyId') companyId: string,
      @Param('id') id: string,
    ) {
      return this.service.remove(id, companyId);
    }
  }
