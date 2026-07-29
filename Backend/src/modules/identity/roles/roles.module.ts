import { Module } from '@nestjs/common';

import { PrismaModule } from '../../../core/prisma/prisma.module';

import { RolesController } from './controllers/roles.controller';
import { RolesService } from './services/roles.service';
import { RolesRepository } from './repositories/roles.repository';

@Module({
  imports: [
    PrismaModule,
  ],
  controllers: [
    RolesController,
  ],
  providers: [
    RolesRepository,
    RolesService,
  ],
  exports: [
    RolesRepository,
    RolesService,
  ],
})
export class RolesModule {}