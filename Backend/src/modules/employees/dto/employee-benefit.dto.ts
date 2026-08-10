import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class EmployeeBenefitDto {
  @IsString()
  @IsNotEmpty()
  benefitId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  value?: number;

  @ApiPropertyOptional({
    description:
      'Só pra benefícios do tipo PERCENTAGE (ex.: Vale Transporte) — % sobre o salário do colaborador.',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  percentage?: number;
}
