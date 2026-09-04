import { ServiceOrderStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class ServiceOrderFilterDto {
  @IsOptional()
  @IsString()
  partnerId?: string;

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsEnum(ServiceOrderStatus)
  status?: ServiceOrderStatus;
}
