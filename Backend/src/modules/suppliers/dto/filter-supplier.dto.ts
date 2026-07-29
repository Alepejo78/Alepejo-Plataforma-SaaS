import { IsOptional, IsString } from 'class-validator';

export class FilterSupplierDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  page?: number = 1;

  @IsOptional()
  limit?: number = 20;
}