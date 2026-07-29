import { Module } from '@nestjs/common';

import { PrismaModule } from '../../../core/prisma/prisma.module';

import { PermissionsController } from './controllers/permissions.controller';
import { PermissionsService } from './services/permissions.service';
import { PermissionsRepository } from './repositories/permissions.repository';

@Module({
  imports: [
    PrismaModule,
  ],
  controllers: [
    PermissionsController,
  ],
  providers: [
    PermissionsRepository,
    PermissionsService,
  ],
  exports: [
    PermissionsRepository,
    PermissionsService,
  ],
})
export class PermissionsModule {}