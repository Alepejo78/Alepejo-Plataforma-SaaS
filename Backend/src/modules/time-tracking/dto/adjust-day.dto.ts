import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export class AdjustDayDto {
  @ApiProperty()
  @IsString()
  employeeId: string;

  @ApiProperty({ description: 'Data (AAAA-MM-DD) do dia a ajustar.' })
  @IsDateString()
  date: string;

  @ApiProperty({ required: false, example: '07:30' })
  @IsOptional()
  @IsString()
  @Matches(TIME_PATTERN, { message: 'Início deve estar no formato HH:MM.' })
  start?: string;

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

  @ApiProperty({ required: false, example: '17:30' })
  @IsOptional()
  @IsString()
  @Matches(TIME_PATTERN, { message: 'Saída deve estar no formato HH:MM.' })
  end?: string;

  @ApiProperty({
    description: 'Motivo do ajuste — obrigatório, fica registrado na auditoria.',
  })
  @IsString()
  @MaxLength(500)
  justification: string;
}
