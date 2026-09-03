import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class UpsertSalesSettingsDto {
  @ApiProperty({
    required: false,
    description:
      'Máximo de parcelas que o cliente pode escolher ao aprovar um orçamento "a prazo".',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxInstallments?: number;

  @ApiProperty({
    required: false,
    description: 'Até quantas parcelas não tem juros nenhum.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  interestFreeInstallments?: number;

  @ApiProperty({
    required: false,
    description:
      'Juros somado ao total pra cada parcela acima do limite sem juros (%, ex.: 2.00 = 2% por parcela extra).',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  interestRatePerInstallment?: number;
}
