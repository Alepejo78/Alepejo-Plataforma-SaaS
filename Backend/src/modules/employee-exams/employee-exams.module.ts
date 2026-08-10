import { Module } from '@nestjs/common';

import { PrismaModule } from '../../core/prisma/prisma.module';

import { EmployeeExamsController } from './controllers/employee-exams.controller';
import { EmployeeExamsService } from './services/employee-exams.service';
import { EmployeeExamsRepository } from './repositories/employee-exams.repository';

@Module({
  imports: [PrismaModule],
  controllers: [EmployeeExamsController],
  providers: [EmployeeExamsService, EmployeeExamsRepository],
  exports: [EmployeeExamsService, EmployeeExamsRepository],
})
export class EmployeeExamsModule {}
