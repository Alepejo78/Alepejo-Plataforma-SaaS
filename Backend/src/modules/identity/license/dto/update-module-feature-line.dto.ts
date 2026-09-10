import { PartialType } from '@nestjs/mapped-types';

import { CreateModuleFeatureLineDto } from './create-module-feature-line.dto';

export class UpdateModuleFeatureLineDto extends PartialType(
  CreateModuleFeatureLineDto,
) {}
