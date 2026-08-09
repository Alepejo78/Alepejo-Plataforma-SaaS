import { PartialType } from '@nestjs/mapped-types';
import { CreateJobFunctionDto } from './create-job-function.dto';

export class UpdateJobFunctionDto extends PartialType(
  CreateJobFunctionDto,
) {}
