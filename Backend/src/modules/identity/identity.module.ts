import { Module } from '@nestjs/common';

import { CompanyModule } from './company/company.module';
import { CompanyBrandingModule } from './company-branding/company-branding.module';
import { ProfileModule } from './profile/profile.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { RolesModule } from './roles/roles.module';
import { PermissionsModule } from './permissions/permissions.module';
import { RolePermissionsModule } from './role-permissions/role-permissions.module';
import { UserRolesModule } from './user-roles/user-roles.module';
import { LicenseModule } from './license/license.module';

@Module({
  imports: [
    CompanyModule,
    CompanyBrandingModule,
    ProfileModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    RolePermissionsModule,
    UserRolesModule,
    AuthModule,
    LicenseModule,
  ],
  exports: [
    CompanyModule,
    CompanyBrandingModule,
    ProfileModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    RolePermissionsModule,
    UserRolesModule,
    AuthModule,
    LicenseModule,
  ],
})
export class IdentityModule {}