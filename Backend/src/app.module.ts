import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

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
import { PurchaseModule } from './modules/purchase/purchase.module';
import { SalesModule } from './modules/sales/sales.module';

@Module({
  imports: [
    PrismaModule,
    SecurityModule,

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
    PurchaseModule,
    SalesModule,
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
