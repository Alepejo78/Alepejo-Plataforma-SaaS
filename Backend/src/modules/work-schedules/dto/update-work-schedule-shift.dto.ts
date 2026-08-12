import { PartialType } from '@nestjs/mapped-types';
import { CreateWorkScheduleShiftDto } from './create-work-schedule-shift.dto';

export class UpdateWorkScheduleShiftDto extends PartialType(
  CreateWorkScheduleShiftDto,
) {}
