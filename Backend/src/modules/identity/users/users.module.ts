import { Module } from '@nestjs/common';

import { PrismaModule } from '../../../core/prisma/prisma.module';

import { CompanyModule } from '../company/company.module';

import { UsersController } from './controllers/users.controller';
import { UsersService } from './services/users.service';
import { UsersRepository } from './repositories/users.repository';

@Module({
  imports: [
    PrismaModule,
    CompanyModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService],
})
export class UsersModule {}