import { Module } from '@nestjs/common';

import { PrismaModule } from '../../core/prisma/prisma.module';

import { CboController } from './controllers/cbo.controller';
import { CboService } from './services/cbo.service';

@Module({
  imports: [PrismaModule],
  controllers: [CboController],
  providers: [CboService],
})
export class CboModule {}
