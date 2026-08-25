import { Module } from '@nestjs/common';

import { PrismaModule } from '../../core/prisma/prisma.module';

import { InAppNotificationsController } from './controllers/in-app-notifications.controller';
import { InAppNotificationsService } from './services/in-app-notifications.service';
import { InAppNotificationsCronService } from './services/in-app-notifications-cron.service';

/**
 * De propósito SEM importar BusinessPartnersModule/ProductsModule/
 * EmployeesModule/PurchaseModule/SalesModule/QuotationsModule: o cron
 * consulta o Prisma direto (ver comentário em
 * InAppNotificationsCronService) justamente pra este módulo poder ser
 * importado por eles (hook de "novo cadastro") sem fechar ciclo.
 */
@Module({
  imports: [PrismaModule],
  controllers: [InAppNotificationsController],
  providers: [InAppNotificationsService, InAppNotificationsCronService],
  exports: [InAppNotificationsService],
})
export class InAppNotificationsModule {}
