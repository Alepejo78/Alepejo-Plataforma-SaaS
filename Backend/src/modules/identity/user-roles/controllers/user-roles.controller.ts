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
    @ApiOperation({
      summary: 'Vincular papel ao usuário',
    })
    assign(
      @Body() dto: AssignUserRoleDto,
    ) {
      return this.service.assign(dto);
    }
  
    @Get()
    @ApiOperation({
      summary: 'Listar vínculos',
    })
    findAll(
      @Query() filter: UserRoleFilterDto,
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