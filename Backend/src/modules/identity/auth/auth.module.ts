import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { PrismaModule } from '../../../core/prisma/prisma.module';

import { LicenseModule } from '../license/license.module';
import { UsersModule } from '../users/users.module';

import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ACCESS_TOKEN_EXPIRES_IN } from './constants/token.constants';

@Module({
  imports: [
    PrismaModule,

    PassportModule.register({
      defaultStrategy: 'jwt',
    }),

    JwtModule.register({
      secret:
        process.env.JWT_SECRET ??
        'alepejo-secret',
      signOptions: {
        expiresIn: ACCESS_TOKEN_EXPIRES_IN,
      },
    }),

    LicenseModule,
    UsersModule,
  ],

  controllers: [AuthController],

  providers: [
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
  ],

  exports: [
    AuthService,
    JwtAuthGuard,
    JwtModule,
    PassportModule,
    LicenseModule,
  ],
})
export class AuthModule {}