import {
    Body,
    Controller,
    Post,
  } from '@nestjs/common';
  
  import {
    ApiOperation,
    ApiResponse,
    ApiTags,
  } from '@nestjs/swagger';
  
  import { LoginDto } from '../dto/login.dto';
  import { AuthService } from '../services/auth.service';
  
  @ApiTags('Auth')
  @Controller('auth')
  export class AuthController {
    constructor(
      private readonly authService: AuthService,
    ) {}
  
    @Post('login')
    @ApiOperation({
      summary: 'Autenticar usuário',
    })
    @ApiResponse({
      status: 200,
      description: 'Usuário autenticado com sucesso.',
    })
    @ApiResponse({
      status: 401,
      description: 'Credenciais inválidas.',
    })
    login(
      @Body() dto: LoginDto,
    ) {
      return this.authService.validateUser(
        dto.email,
        dto.password,
      );
    }
  }