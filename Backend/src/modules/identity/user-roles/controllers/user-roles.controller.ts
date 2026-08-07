import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Query,
  } from '@nestjs/common';
  import {
    ApiOperation,
    ApiTags,
  } from '@nestjs/swagger';

  import { CurrentUser } from '../../../../core/decorators/current-user.decorator';
  import { Permissions } from '../../auth/decorators/permissions.decorator';

  import { AssignUserRoleDto } from '../dto/assign-user-role.dto';
  import { UserRoleFilterDto } from '../dto/user-role-filter.dto';
  import { UserRolesService } from '../services/user-roles.service';

  @ApiTags('User Roles')
  @Controller('identity/user-roles')
  export class UserRolesController {
    constructor(
      private readonly service: UserRolesService,
    ) {}

    @Post()
    @Permissions('user-role.manage')
    @ApiOperation({
      summary: 'Vincular papel ao usuário',
    })
    assign(
      @CurrentUser('companyId') companyId: string,
      @Body() dto: AssignUserRoleDto,
    ) {
      return this.service.assign(companyId, dto);
    }

    @Get()
    @Permissions('user-role.view')
    @ApiOperation({
      summary: 'Listar vínculos',
    })
    findAll(
      @CurrentUser('companyId') companyId: string,
      @Query() filter: UserRoleFilterDto,
    ) {
      return this.service.findAll(companyId, filter);
    }

    @Get(':id')
    @Permissions('user-role.view')
    @ApiOperation({
      summary: 'Buscar vínculo por ID',
    })
    findById(
      @CurrentUser('companyId') companyId: string,
      @Param('id') id: string,
    ) {
      return this.service.findById(companyId, id);
    }

    @Delete(':id')
    @Permissions('user-role.manage')
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
