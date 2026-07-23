import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { PrismaModule } from './core/prisma/prisma.module';
import { SecurityModule } from './core/common/security/security.module';

import { IdentityModule } from './modules/identity/identity.module';
import { PlatformModule } from './modules/platform/platform.module';

@Module({
  imports: [
    PrismaModule,
    SecurityModule,

    IdentityModule,
    PlatformModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}