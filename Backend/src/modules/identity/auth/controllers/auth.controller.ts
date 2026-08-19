import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Response, Request } from 'express';

import { Public } from '../../../../core/decorators/public.decorator';
import { CurrentUser } from '../../../../core/decorators/current-user.decorator';

import { AuthService } from '../services/auth.service';
import { UsersService } from '../../users/services/users.service';

import { LoginDto } from '../dto/login.dto';
import { SetPasswordDto } from '../dto/set-password.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { SwitchCompanyDto } from '../dto/switch-company.dto';
import type { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  accessTokenCookieOptions,
  refreshTokenCookieOptions,
  clearCookieOptions,
} from '../constants/cookie.constants';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Grava os tokens em cookies httpOnly e devolve apenas os dados
   * públicos da sessão. Os tokens NÃO voltam no corpo da resposta:
   * assim nenhum JavaScript do frontend consegue lê-los, o que
   * neutraliza roubo de sessão por XSS.
   */
  private setSessionCookies(
    res: Response,
    tokens: { accessToken: string; refreshToken: string },
  ): void {
    res.cookie(
      ACCESS_TOKEN_COOKIE,
      tokens.accessToken,
      accessTokenCookieOptions(),
    );

    res.cookie(
      REFRESH_TOKEN_COOKIE,
      tokens.refreshToken,
      refreshTokenCookieOptions(),
    );
  }

  @Public()
  @Post('login')
  @ApiOperation({
    summary: 'Realizar autenticação',
  })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);

    this.setSessionCookies(res, result);

    return {
      user: result.user,
      expiresIn: result.expiresIn,
    };
  }

  @Public()
  @Post('refresh')
  @ApiOperation({
    summary: 'Renovar Access Token',
  })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE];

    let result: Awaited<
      ReturnType<AuthService['refresh']>
    >;

    try {
      result = await this.authService.refresh({
        refreshToken,
      });
    } catch (error) {
      // Sessão irrecuperável: limpa os cookies para que o usuário
      // consiga voltar à tela de login em vez de ficar com um
      // cookie inválido preso no navegador.
      res.clearCookie(
        ACCESS_TOKEN_COOKIE,
        clearCookieOptions(),
      );

      res.clearCookie(
        REFRESH_TOKEN_COOKIE,
        clearCookieOptions(),
      );

      throw error;
    }

    this.setSessionCookies(res, result);

    return {
      user: result.user,
      expiresIn: result.expiresIn,
    };
  }

  /**
   * "Esqueci minha senha" — o próprio usuário pede o link por e-mail.
   * Público de propósito: quem esqueceu a senha não consegue logar
   * pra pedir. Responde sempre igual, exista o e-mail ou não (ver
   * UsersService.requestPasswordResetByEmail).
   */
  @Public()
  @Post('forgot-password')
  @ApiOperation({
    summary: 'Solicitar link de redefinição de senha por e-mail',
  })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.usersService.requestPasswordResetByEmail(dto.email);
  }

  /**
   * Só pra mostrar o e-mail da conta na tela de "definir senha", antes
   * de digitar a senha nova — confirma visualmente pra qual conta é o
   * link. Exige o token certo (mesma checagem do set-password), então
   * não dá pra descobrir e-mail de ninguém só chutando um userId.
   */
  @Public()
  @Get('reset-info')
  @ApiOperation({
    summary: 'E-mail da conta a partir do token de redefinição',
  })
  async resetInfo(
    @Query('userId') userId: string,
    @Query('token') token: string,
  ) {
    return this.usersService.getResetInfo(userId, token);
  }

  /**
   * Consumo do link de "definir senha" enviado por e-mail (usuário
   * novo ou "Alterar Senha" na lista). Público de propósito — quem
   * clica no link ainda não tem sessão.
   */
  @Public()
  @Post('set-password')
  @ApiOperation({
    summary: 'Definir senha a partir do token enviado por e-mail',
  })
  async setPassword(
    @Body() dto: SetPasswordDto,
  ) {
    return this.usersService.setPasswordWithToken(
      dto.userId,
      dto.token,
      dto.password,
    );
  }

  @Get('me')
  @ApiOperation({
    summary: 'Dados da sessão atual',
  })
  async me(
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return user;
  }

  /**
   * Login cruzado: troca a empresa ativa da sessão por outra empresa
   * que este login tem vínculo (ver UserCompany/GET /companies/my-companies).
   * Não exige permissão especial — o vínculo em si já é o controle de
   * acesso, checado dentro do AuthService.
   */
  @Post('switch-company')
  @ApiOperation({
    summary: 'Trocar a empresa ativa da sessão (login cruzado)',
  })
  async switchCompany(
    @CurrentUser('id') userId: string,
    @Body() dto: SwitchCompanyDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.switchCompany(
      userId,
      dto.companyId,
    );

    this.setSessionCookies(res, result);

    return {
      user: result.user,
      expiresIn: result.expiresIn,
    };
  }

  /**
   * Público de propósito: sair precisa funcionar MESMO com token
   * inválido ou expirado. Se exigisse autenticação, um usuário com
   * cookie inválido receberia 401 e ficaria preso, sem conseguir
   * limpar a sessão.
   *
   * A revogação no banco só ocorre se houver usuário identificado;
   * a limpeza dos cookies acontece sempre.
   */
  @Public()
  @Post('logout')
  @ApiOperation({
    summary: 'Efetuar logout',
  })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.clearCookie(ACCESS_TOKEN_COOKIE, clearCookieOptions());
    res.clearCookie(REFRESH_TOKEN_COOKIE, clearCookieOptions());

    const accessToken =
      req.cookies?.[ACCESS_TOKEN_COOKIE];

    if (accessToken) {
      await this.authService.logoutByAccessToken(
        accessToken,
      );
    }

    return {
      success: true,
      message: 'Logout realizado com sucesso.',
    };
  }
}
