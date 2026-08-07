import {
  IsDateString,
  IsOptional,
  IsString,
} from 'class-validator';

export class AssignCompanyPlanDto {
  @IsString()
  planId!: string;

  @IsOptional()
  @IsDateString()
  trialEndsAt?: Date;
}
