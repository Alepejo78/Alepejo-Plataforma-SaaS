import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsString, Matches } from 'class-validator';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export class SelfReportDayDto {
  @ApiProperty({ description: 'Data (AAAA-MM-DD) do lançamento.' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: '07:30' })
  @IsString()
  @Matches(TIME_PATTERN, { message: 'Início deve estar no formato HH:MM.' })
  start: string;

  @ApiProperty({ example: '12:00' })
  @IsString()
  @Matches(TIME_PATTERN, {
    message: 'Início do intervalo deve estar no formato HH:MM.',
  })
  breakStart: string;

  @ApiProperty({ example: '13:12' })
  @IsString()
  @Matches(TIME_PATTERN, {
    message: 'Fim do intervalo deve estar no formato HH:MM.',
  })
  breakEnd: string;

  @ApiProperty({ example: '17:30' })
  @IsString()
  @Matches(TIME_PATTERN, { message: 'Saída deve estar no formato HH:MM.' })
  end: string;
}
