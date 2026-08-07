import { SetMetadata } from '@nestjs/common';

export const MODULE_KEY = 'module';

export const Module = (
  moduleCode: string,
) => SetMetadata(
  MODULE_KEY,
  moduleCode.toUpperCase(),
);