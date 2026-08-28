import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { InventoryCountStatus } from '@prisma/client';

export class InventoryCountFilterDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  warehouseId?: string;

  @ApiProperty({ required: false, enum: InventoryCountStatus })
  @IsOptional()
  @IsEnum(InventoryCountStatus)
  status?: InventoryCountStatus;
}
