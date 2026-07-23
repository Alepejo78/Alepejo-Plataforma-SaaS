import { Module } from '@nestjs/common';

import { CompanyModule } from './company/company.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    CompanyModule,
    UsersModule,
    AuthModule,
  ],
  exports: [
    CompanyModule,
    UsersModule,
    AuthModule,
  ],
})
export class IdentityModule {}