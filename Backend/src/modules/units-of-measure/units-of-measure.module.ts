import { Module } from '@nestjs/common';

import { PrismaModule } from '../../core/prisma/prisma.module';

import { UnitsOfMeasureController } from './controllers/units-of-measure.controller';
import { UnitsOfMeasureRepository } from './repositories/units-of-measure.repository';
import { UnitsOfMeasureService } from './services/units-of-measure.service';

@Module({
  imports: [PrismaModule],
  controllers: [UnitsOfMeasureController],
  providers: [
    UnitsOfMeasureService,
    UnitsOfMeasureRepository,
  ],
  exports: [
    UnitsOfMeasureService,
    UnitsOfMeasureRepository,
  ],
})
export class UnitsOfMeasureModule {}