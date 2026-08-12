import { ApiProperty } from '@nestjs/swagger';
import { Weekday } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateWorkScheduleShiftDto {
  @ApiProperty({ enum: Weekday })
  @IsEnum(Weekday)
  dayFrom: Weekday;

  @ApiProperty({ enum: Weekday })
  @IsEnum(Weekday)
  dayTo: Weekday;

  @ApiProperty({ example: '07:30' })
  @IsString()
  @Matches(TIME_PATTERN, {
    message: 'Hora início deve estar no formato HH:MM.',
  })
  startTime: string;

  @ApiProperty({ required: false, example: '12:00' })
  @IsOptional()
  @IsString()
  @Matches(TIME_PATTERN, {
    message: 'Início do intervalo deve estar no formato HH:MM.',
  })
  breakStart?: string;

  @ApiProperty({ required: false, example: '13:12' })
  @IsOptional()
  @IsString()
  @Matches(TIME_PATTERN, {
    message: 'Fim do intervalo deve estar no formato HH:MM.',
  })
  breakEnd?: string;

  @ApiProperty({ example: '17:30' })
  @IsString()
  @Matches(TIME_PATTERN, {
    message: 'Hora saída deve estar no formato HH:MM.',
  })
  endTime: string;

  @ApiProperty({
    required: false,
    description:
      'Minutos de intervalo usados no cálculo quando início/fim do intervalo não são informados.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  lunchBreakMinutes?: number;
}
