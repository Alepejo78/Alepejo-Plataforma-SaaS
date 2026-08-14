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

    @Patch(':id/activate')
    @Permissions('user.update')
    @ApiOperation({ summary: 'Ativar usuário' })
    activate(
      @CurrentUser('companyId') companyId: string,
      @Param('id') id: string,
    ) {
      return this.usersService.activate(companyId, id);
    }

    @Patch(':id/deactivate')
    @Permissions('user.update')
    @ApiOperation({ summary: 'Desativar usuário' })
    deactivate(
      @CurrentUser('companyId') companyId: string,
      @Param('id') id: string,
    ) {
      return this.usersService.deactivate(companyId, id);
    }

    @Patch(':id/block')
    @Permissions('user.update')
    @ApiOperation({ summary: 'Bloquear conta do usuário' })
    block(
      @CurrentUser('companyId') companyId: string,
      @Param('id') id: string,
    ) {
      return this.usersService.block(companyId, id);
    }

    @Patch(':id/unblock')
    @Permissions('user.update')
    @ApiOperation({ summary: 'Desbloquear conta do usuário' })
    unblock(
      @CurrentUser('companyId') companyId: string,
      @Param('id') id: string,
    ) {
      return this.usersService.unblock(companyId, id);
    }

    @Post(':id/reset-password-email')
    @Permissions('user.update')
    @ApiOperation({
      summary: 'Enviar e-mail de redefinição de senha',
    })
    requestPasswordReset(
      @CurrentUser('companyId') companyId: string,
      @Param('id') id: string,
    ) {
      return this.usersService.requestPasswordReset(companyId, id);
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
