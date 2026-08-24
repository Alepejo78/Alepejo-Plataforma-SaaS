import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsPositive } from 'class-validator';

export class InvoiceInstallmentDto {
  @ApiProperty()
  @IsDateString()
  dueDate: string;

  @ApiProperty({ example: 150.0 })
  @IsNumber()
  @IsPositive()
  amount: number;
}
