import {
  IsInt,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class StartTrialDto {
  @IsString()
  moduleId!: string;

  @IsInt()
  @Min(1)
  @Max(30)
  days!: number;
}
