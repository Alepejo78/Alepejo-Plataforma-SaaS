import {
  Body,
  Controller,
  Post,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { AuthService } from '../services/auth.service';

import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  @Post('login')
  @ApiOperation({
    summary: 'Realizar autenticação',
  })
  async login(
    @Body() dto: LoginDto,
  ) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @ApiOperation({
    summary: 'Renovar Access Token',
  })
  async refresh(
    @Body() dto: RefreshTokenDto,
  ) {
    return this.authService.refresh(dto);
  }

  @Post('logout')
  @ApiOperation({
    summary: 'Efetuar logout',
  })
  async logout(
    @Body() dto: RefreshTokenDto,
  ) {
    return this.authService.logout(dto);
  }
}