import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { PrismaModule } from './core/prisma/prisma.module';
import { SecurityModule } from './core/security/security.module';

import { JwtAuthGuard } from './modules/identity/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from './modules/identity/auth/guards/permissions.guard';
import { LicenseGuard } from './modules/identity/license/guards/license.guard';

import { IdentityModule } from './modules/identity/identity.module';
import { PlatformModule } from './modules/platform/platform.module';
import { BusinessPartnersModule } from './modules/business-partners/business-partners.module';

import { ProductsModule } from './modules/products/products.module';
import { ProductCategoriesModule } from './modules/product-categories/product-categories.module';
import { BrandsModule } from './modules/brands/brands.module';
import { UnitsOfMeasureModule } from './modules/units-of-measure/units-of-measure.module';
import { WarehouseModule } from './modules/warehouse/warehouse.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { StockMovementModule } from './modules/stock-movement/stock-movement.module';
import { StockHoldModule } from './modules/stock-hold/stock-hold.module';
import { PurchaseModule } from './modules/purchase/purchase.module';
import { SalesModule } from './modules/sales/sales.module';
import { QuotesModule } from './modules/quotes/quotes.module';
import { SalesOrdersModule } from './modules/sales-orders/sales-orders.module';
import { QuotationsModule } from './modules/quotations/quotations.module';
import { PurchaseOrdersModule } from './modules/purchase-orders/purchase-orders.module';
import { ChartOfAccountsModule } from './modules/chart-of-accounts/chart-of-accounts.module';
import { ChartOfAccountClassificationsModule } from './modules/chart-of-account-classifications/chart-of-account-classifications.module';
import { FinancialEntriesModule } from './modules/financial-entries/financial-entries.module';
import { BudgetsModule } from './modules/budgets/budgets.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

import { SectorsModule } from './modules/sectors/sectors.module';
import { WorkSchedulesModule } from './modules/work-schedules/work-schedules.module';
import { PpeTypesModule } from './modules/ppe-types/ppe-types.module';
import { BenefitsModule } from './modules/benefits/benefits.module';
import { JobFunctionsModule } from './modules/job-functions/job-functions.module';
import { CboModule } from './modules/cbo/cbo.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { PpeDeliveriesModule } from './modules/ppe-deliveries/ppe-deliveries.module';
import { EmployeeExamsModule } from './modules/employee-exams/employee-exams.module';
import { ScheduledNotificationsModule } from './modules/scheduled-notifications/scheduled-notifications.module';
import { ProductionModule } from './modules/production/production.module';
import { TimeTrackingModule } from './modules/time-tracking/time-tracking.module';

@Module({
  imports: [
    PrismaModule,
    SecurityModule,
    ScheduleModule.forRoot(),

    IdentityModule,
    PlatformModule,

    BusinessPartnersModule,
    ProductsModule,
    ProductCategoriesModule,
    BrandsModule,
    UnitsOfMeasureModule,
    WarehouseModule,
    InventoryModule,
    StockMovementModule,
    StockHoldModule,
    PurchaseModule,
    SalesModule,
    QuotesModule,
    SalesOrdersModule,
    QuotationsModule,
    PurchaseOrdersModule,
    ChartOfAccountsModule,
    ChartOfAccountClassificationsModule,
    FinancialEntriesModule,
    BudgetsModule,
    NotificationsModule,

    SectorsModule,
    WorkSchedulesModule,
    PpeTypesModule,
    BenefitsModule,
    JobFunctionsModule,
    CboModule,
    EmployeesModule,
    PpeDeliveriesModule,
    EmployeeExamsModule,
    ScheduledNotificationsModule,
    ProductionModule,
    TimeTrackingModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Ordem importa: 1) autentica (JWT) -> 2) checa licença do módulo
    // (LicenseGuard, live no banco) -> 3) checa permissão granular (RBAC).
    // Aplicados globalmente aqui via APP_GUARD (única fonte de verdade;
    // NÃO registrar de novo em main.ts com app.useGlobalGuards()).
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: LicenseGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
})
export class AppModule {}
