import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';

import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';
import { SupplierRepository } from './repositories/supplier.repository';

@Module({
  imports: [PrismaModule],
  controllers: [SuppliersController],
  providers: [
    SuppliersService,
    SupplierRepository,
  ],
  exports: [
    SuppliersService,
  ],
})
export class SuppliersModule {}