import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { DefaultAccountingService } from './default-accounting.service';

@Module({
  imports: [PrismaModule],
  providers: [DefaultAccountingService],
  exports: [DefaultAccountingService],
})
export class DefaultAccountingModule {}
