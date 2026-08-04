import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { PrismaModule } from './core/prisma/prisma.module';
import { SecurityModule } from './core/security/security.module';

import { IdentityModule } from './modules/identity/identity.module';
import { PlatformModule } from './modules/platform/platform.module';
import { ClientsModule } from './modules/clients/clients.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';

import { ProductsModule } from './modules/products/products.module';
import { ProductCategoriesModule } from './modules/product-categories/product-categories.module';
import { WarehouseModule } from './modules/warehouse/warehouse.module';
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
    WarehouseModule,
    StockMovementModule,
    PurchaseModule,
    SalesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}