import { BenefitCalculationType } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateBenefitDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsOptional()
  @IsEnum(BenefitCalculationType)
  calculationType?: BenefitCalculationType = 'FIXED';

  @IsOptional()
  @IsBoolean()
  active?: boolean = true;
}
