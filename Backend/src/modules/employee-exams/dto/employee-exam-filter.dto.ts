import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class EmployeeExamFilterDto {
  @IsOptional()
  @IsString()
  employeeId?: string;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  limit = 10000;
}
