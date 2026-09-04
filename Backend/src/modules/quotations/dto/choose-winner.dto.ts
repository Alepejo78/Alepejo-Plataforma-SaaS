import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';

export class ChooseWinnerDto {
  @ApiProperty({
    required: false,
    description:
      'Gerar já um título no Financeiro (Contas a Pagar) pra este fornecedor — pagamento antecipado.',
  })
  @IsOptional()
  @IsBoolean()
  generateFinancialEntry?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiProperty({ required: false, enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  chartOfAccountId?: string;
}
