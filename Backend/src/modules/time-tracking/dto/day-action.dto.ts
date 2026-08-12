import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsString } from 'class-validator';

export class DayActionDto {
  @ApiProperty()
  @IsString()
  employeeId: string;

  @ApiProperty({ description: 'Data (AAAA-MM-DD) do dia a aprovar/reabrir.' })
  @IsDateString()
  date: string;
}
