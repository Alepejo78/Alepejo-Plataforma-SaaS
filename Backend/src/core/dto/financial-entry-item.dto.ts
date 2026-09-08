import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * Um item/linha da composição de um título (ver
 * `FinancialEntry.items`) — usado quando o título nasce com mais de
 * um produto/serviço (ex.: importação de orçamento com peça +
 * serviço), cada um com sua própria conta contábil.
 */
export class FinancialEntryItemDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  chartOfAccountId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  quantity?: number;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  amount: number;
}
