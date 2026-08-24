import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsPositive } from 'class-validator';

/**
 * Uma parcela — usado sempre que um documento (recebimento de
 * compra, aprovação de venda, lançamento direto em contas a
 * pagar/receber) pode ser dividido em mais de um título financeiro.
 */
export class InstallmentDto {
  @ApiProperty()
  @IsDateString()
  dueDate: string;

  @ApiProperty({ example: 150.0 })
  @IsNumber()
  @IsPositive()
  amount: number;
}
