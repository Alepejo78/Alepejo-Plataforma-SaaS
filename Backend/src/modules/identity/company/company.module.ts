import { Module } from '@nestjs/common';

import { CompanyController } from './controllers/company.controller';
import { CompanyService } from './services/company.service';
import { CompanyRepository } from './repositories/company.repository';

import { PrismaModule } from '../../../core/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CompanyController],
  providers: [CompanyService, CompanyRepository],
  exports: [CompanyService],
})
export class CompanyModule {}