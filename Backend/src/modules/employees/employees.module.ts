import { Module } from '@nestjs/common';

import { PrismaModule } from '../../core/prisma/prisma.module';
import { DocumentSequenceModule } from '../../core/document-sequence/document-sequence.module';
import { InAppNotificationsModule } from '../in-app-notifications/in-app-notifications.module';

import { EmployeesController } from './controllers/employees.controller';
import { EmployeesService } from './services/employees.service';
import { EmployeePhotoService } from './services/employee-photo.service';
import { EmployeesRepository } from './repositories/employees.repository';

@Module({
  imports: [PrismaModule, DocumentSequenceModule, InAppNotificationsModule],
  controllers: [EmployeesController],
  providers: [
    EmployeesService,
    EmployeePhotoService,
    EmployeesRepository,
  ],
  exports: [EmployeesService, EmployeesRepository],
})
export class EmployeesModule {}
