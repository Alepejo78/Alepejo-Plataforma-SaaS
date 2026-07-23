import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { PrismaModule } from '../../../core/prisma/prisma.module';

import { UsersModule } from '../users/users.module';

import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';

@Module({
  imports: [
    PrismaModule,
    UsersModule,

    PassportModule.register({
      defaultStrategy: 'jwt',
    }),

    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: {
        expiresIn: '15m',
      },
    }),
  ],

  controllers: [AuthController],

  providers: [AuthService],

  exports: [AuthService, JwtModule],
})
export class AuthModule {}