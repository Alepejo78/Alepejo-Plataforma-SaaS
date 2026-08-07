import {
  IsDateString,
  IsOptional,
  IsString,
} from 'class-validator';

export class EnableModuleDto {
  @IsString()
  moduleId!: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: Date;
}
