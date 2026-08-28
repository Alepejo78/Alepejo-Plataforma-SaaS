import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class FinalizeInventoryCountDto {
  @ApiProperty({
    required: false,
    description:
      'Confirma finalizar mesmo com itens ainda pendentes de recontagem.',
  })
  @IsOptional()
  @IsBoolean()
  confirmIncomplete?: boolean;
}
