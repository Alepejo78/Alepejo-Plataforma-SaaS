import { Global, Module } from '@nestjs/common';

import { PasswordService } from './password.service';
import { EncryptionService } from './encryption.service';

@Global()
@Module({
  providers: [PasswordService, EncryptionService],
  exports: [PasswordService, EncryptionService],
})
export class SecurityModule {}