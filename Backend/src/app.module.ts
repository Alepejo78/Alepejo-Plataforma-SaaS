import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { PrismaModule } from './core/prisma/prisma.module';

import { IdentityModule } from './modules/identity/identity.module';
import { PlatformModule } from './modules/platform/platform.module';

import { SecurityModule } from './core/security/security.module';

import { SuppliersModule } from './modules/suppliers/suppliers.module';

@Module({
  imports: [
    PrismaModule,
    SecurityModule,

    IdentityModule,
    PlatformModule,

    SuppliersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}