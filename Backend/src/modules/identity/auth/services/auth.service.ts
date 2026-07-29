import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../../../../core/prisma/prisma.service';

import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        email: dto.email,
        active: true,
        deletedAt: null,
      },
      include: {
        company: true,
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException(
        'Usuário ou senha inválidos.',
      );
    }

    const passwordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!passwordValid) {
      throw new UnauthorizedException(
        'Usuário ou senha inválidos.',
      );
    }

    return user;
  }

  async login(dto: LoginDto) {
    const user = await this.validateUser(dto);

    const permissions = user.roles.flatMap((userRole) =>
      userRole.role.permissions.map(
        (rolePermission) => rolePermission.permission.code,
      ),
    );

    const payload = {
      sub: user.id,
      companyId: user.companyId,
      email: user.email,
      name: user.name,
      permissions,
    };

    const accessToken = await this.jwtService.signAsync(
      payload,
    );

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: '1h',
      user: {
        id: user.id,
        companyId: user.companyId,
        name: user.name,
        email: user.email,
        status: user.status,
      },
    };
  }

  async refresh(
    dto: RefreshTokenDto,
  ) {
    throw new UnauthorizedException(
      'Refresh Token ainda não implementado.',
    );
  }

  async logout(
    dto: RefreshTokenDto,
  ) {
    return {
      success: true,
      message: 'Logout realizado com sucesso.',
    };
  }
}