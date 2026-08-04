import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { PrismaModule } from './core/prisma/prisma.module';
import { SecurityModule } from './core/security/security.module';

import { JwtAuthGuard } from './modules/identity/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from './modules/identity/auth/guards/permissions.guard';

import { IdentityModule } from './modules/identity/identity.module';
import { PlatformModule } from './modules/platform/platform.module';
import { ClientsModule } from './modules/clients/clients.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';

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

    ClientsModule,
    SuppliersModule,
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
    // Ordem importa: primeiro autentica (JWT), depois autoriza (permissões).
    // Aplicados globalmente: todo endpoint exige token válido,
    // a menos que seja marcado com @Public().
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
})
export class AppModule {}
