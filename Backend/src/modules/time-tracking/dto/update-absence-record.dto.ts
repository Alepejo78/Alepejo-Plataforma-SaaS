import { PartialType } from '@nestjs/mapped-types';
import { CreateAbsenceRecordDto } from './create-absence-record.dto';

export class UpdateAbsenceRecordDto extends PartialType(
  CreateAbsenceRecordDto,
) {}
