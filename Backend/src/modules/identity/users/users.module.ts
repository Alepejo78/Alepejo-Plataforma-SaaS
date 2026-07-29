import { Module } from '@nestjs/common';

import { PrismaModule } from '../../../core/prisma/prisma.module';
import { SecurityModule } from '../../../core/security/security.module';

import { CompanyModule } from '../company/company.module';

import { UsersController } from './controllers/users.controller';
import { UsersRepository } from './repositories/users.repository';
import { UsersService } from './services/users.service';

@Module({
  imports: [
    PrismaModule,
    CompanyModule,
    SecurityModule,
  ],
  controllers: [UsersController],
  providers: [
    UsersService,
    UsersRepository,
  ],
  exports: [UsersService],
})
export class UsersModule {}