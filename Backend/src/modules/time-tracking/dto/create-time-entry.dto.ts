import { ApiProperty } from '@nestjs/swagger';
import { TimeEntrySource } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateTimeEntryDto {
  @ApiProperty()
  @IsString()
  employeeId: string;

  @ApiProperty({
    required: false,
    description: 'Sem informar, usa o horário do servidor agora.',
  })
  @IsOptional()
  @IsDateString()
  timestamp?: string;

  @ApiProperty({ required: false, enum: TimeEntrySource })
  @IsOptional()
  @IsEnum(TimeEntrySource)
  source?: TimeEntrySource;

  @ApiProperty({ required: false, maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  observation?: string;
}
