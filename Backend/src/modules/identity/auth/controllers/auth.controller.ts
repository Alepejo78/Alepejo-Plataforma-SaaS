import {
  Body,
  Controller,
  Post,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { Public } from '../../../../core/decorators/public.decorator';
import { CurrentUser } from '../../../../core/decorators/current-user.decorator';

import { AuthService } from '../services/auth.service';

import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  @Public()
  @Post('login')
  @ApiOperation({
    summary: 'Realizar autenticação',
  })
  async login(
    @Body() dto: LoginDto,
  ) {
    return this.authService.login(dto);
  }

  @Public()
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
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.authService.logout(user.id);
  }
}
