import { Module } from '@nestjs/common';

import { PrismaModule } from '../../core/prisma/prisma.module';
import { SecurityModule } from '../../core/security/security.module';

import { CompanyModule } from '../identity/company/company.module';

import { ClientsController } from './controllers/clients.controller';
import { ClientsService } from './services/clients.service';
import { ClientsRepository } from './repositories/clients.repository';

@Module({
  imports: [
    PrismaModule,
    SecurityModule,
    CompanyModule,
  ],
  controllers: [
    ClientsController,
  ],
  providers: [
    ClientsService,
    ClientsRepository,
  ],
  exports: [
    ClientsService,
  ],
})
export class ClientsModule {}