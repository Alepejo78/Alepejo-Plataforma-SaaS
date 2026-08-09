import { ApiPropertyOptional } from '@nestjs/swagger';
import { DependentRelationship } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class EmployeeDependentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional({ enum: DependentRelationship })
  @IsOptional()
  @IsEnum(DependentRelationship)
  relationship?: DependentRelationship;
}
