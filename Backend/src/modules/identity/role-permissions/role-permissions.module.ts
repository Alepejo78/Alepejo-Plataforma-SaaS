import { Module } from '@nestjs/common';

import { PrismaModule } from '../../../core/prisma/prisma.module';

import { RolePermissionsController } from './controllers/role-permissions.controller';
import { RolePermissionsService } from './services/role-permissions.service';
import { RolePermissionsRepository } from './repositories/role-permissions.repository';

@Module({
  imports: [PrismaModule],
  controllers: [RolePermissionsController],
  providers: [
    RolePermissionsService,
    RolePermissionsRepository,
  ],
  exports: [
    RolePermissionsService,
    RolePermissionsRepository,
  ],
})
export class RolePermissionsModule {}