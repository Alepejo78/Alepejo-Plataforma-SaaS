import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateModuleFeatureLineDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  description!: string;

  /// Só anotação/planejamento do admin — nunca soma no preço cobrado.
  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  yearlyPrice?: number;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
