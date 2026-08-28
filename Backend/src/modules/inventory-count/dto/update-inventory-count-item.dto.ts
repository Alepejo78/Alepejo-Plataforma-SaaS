import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateInventoryCountItemDto {
  @ApiProperty()
  @IsString()
  productId: string;

  @ApiProperty({
    required: false,
    description:
      'Quantidade contada — fica em aberto até ser preenchida; precisa estar preenchida em todo item pra poder finalizar.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  countedQuantity?: number;
}
