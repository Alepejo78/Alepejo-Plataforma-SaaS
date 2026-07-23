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
    @ApiOperation({ summary: 'Cadastrar usuário' })
    @ApiResponse({ status: 201, description: 'Usuário cadastrado com sucesso.' })
    @ApiResponse({ status: 409, description: 'E-mail já cadastrado.' })
    create(@Body() createUserDto: CreateUserDto) {
      return this.usersService.create(createUserDto);
    }
  
    @Get()
    @ApiOperation({ summary: 'Listar usuários' })
    findAll() {
      return this.usersService.findAll();
    }
  
    @Get(':id')
    @ApiOperation({ summary: 'Buscar usuário por ID' })
    findById(@Param('id') id: string) {
      return this.usersService.findById(id);
    }
  
    @Patch(':id')
    @ApiOperation({ summary: 'Atualizar usuário' })
    update(
      @Param('id') id: string,
      @Body() updateUserDto: UpdateUserDto,
    ) {
      return this.usersService.update(id, updateUserDto);
    }
  
    @Delete(':id')
    @ApiOperation({ summary: 'Excluir usuário (soft delete)' })
    remove(@Param('id') id: string) {
      return this.usersService.remove(id);
    }
  }