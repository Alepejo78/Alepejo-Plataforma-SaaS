import { PartialType } from '@nestjs/mapped-types';
import { CreatePpeTypeDto } from './create-ppe-type.dto';

export class UpdatePpeTypeDto extends PartialType(
  CreatePpeTypeDto,
) {}
