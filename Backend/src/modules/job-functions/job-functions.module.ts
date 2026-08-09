import { Module } from '@nestjs/common';

import { PrismaModule } from '../../core/prisma/prisma.module';

import { JobFunctionsController } from './controllers/job-functions.controller';
import { JobFunctionsService } from './services/job-functions.service';
import { JobFunctionsRepository } from './repositories/job-functions.repository';

@Module({
  imports: [PrismaModule],
  controllers: [JobFunctionsController],
  providers: [JobFunctionsService, JobFunctionsRepository],
  exports: [JobFunctionsService, JobFunctionsRepository],
})
export class JobFunctionsModule {}
