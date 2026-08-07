import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
  } from '@nestjs/common';
  import {
    ApiOperation,
    ApiResponse,
    ApiTags,
  } from '@nestjs/swagger';

  import { CurrentUser } from '../../../../core/decorators/current-user.decorator';
  import { Permissions } from '../../auth/decorators/permissions.decorator';

  import { UsersService } from '../services/users.service';
  import { CreateUserDto } from '../dto/create-user.dto';
  import { UpdateUserDto } from '../dto/update-user.dto';

  @ApiTags('Users')
  @Controller('users')
  export class UsersController {
    constructor(
      private readonly usersService: UsersService,
    ) {}

    @Post()
    @Permissions('user.create')
    @ApiOperation({ summary: 'Cadastrar usuário' })
    @ApiResponse({ status: 201, description: 'Usuário cadastrado com sucesso.' })
    @ApiResponse({ status: 409, description: 'E-mail já cadastrado.' })
    create(
      @CurrentUser('companyId') companyId: string,
      @Body() createUserDto: CreateUserDto,
    ) {
      return this.usersService.create(companyId, createUserDto);
    }

    @Get()
    @Permissions('user.view')
    @ApiOperation({ summary: 'Listar usuários da minha empresa' })
    findAll(
      @CurrentUser('companyId') companyId: string,
    ) {
      return this.usersService.findAll(companyId);
    }

    @Get(':id')
    @Permissions('user.view')
    @ApiOperation({ summary: 'Buscar usuário por ID' })
    findById(
      @CurrentUser('companyId') companyId: string,
      @Param('id') id: string,
    ) {
      return this.usersService.findById(companyId, id);
    }

    @Patch(':id')
    @Permissions('user.update')
    @ApiOperation({ summary: 'Atualizar usuário' })
    update(
      @CurrentUser('companyId') companyId: string,
      @Param('id') id: string,
      @Body() updateUserDto: UpdateUserDto,
    ) {
      return this.usersService.update(companyId, id, updateUserDto);
    }

    @Delete(':id')
    @Permissions('user.delete')
    @ApiOperation({ summary: 'Excluir usuário (soft delete)' })
    remove(
      @CurrentUser('companyId') companyId: string,
      @Param('id') id: string,
    ) {
      return this.usersService.remove(companyId, id);
    }
  }
