import { Module } from '@nestjs/common';

import { PrismaModule } from '../../../core/prisma/prisma.module';

import { UserRolesController } from './controllers/user-roles.controller';
import { UserRolesService } from './services/user-roles.service';
import { UserRolesRepository } from './repositories/user-roles.repository';

@Module({
  imports: [PrismaModule],
  controllers: [UserRolesController],
  providers: [
    UserRolesService,
    UserRolesRepository,
  ],
  exports: [
    UserRolesService,
    UserRolesRepository,
  ],
})
export class UserRolesModule {}