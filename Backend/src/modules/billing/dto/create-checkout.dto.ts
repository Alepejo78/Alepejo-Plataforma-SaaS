import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import { BILLING_TYPES, type BillingTypeValue } from './subscribe.dto';

export const BILLING_CYCLES = ['MONTHLY', 'YEARLY'] as const;
export type BillingCycleValue = (typeof BILLING_CYCLES)[number];

/**
 * Compra iniciada em /planos, ANTES da empresa existir — por isso só
 * pede o mínimo que o Asaas exige pra emitir a cobrança. O resto do
 * cadastro vem depois, já com o pagamento garantido.
 */
export class CreateCheckoutDto {
  @ApiProperty({ description: 'Plano escolhido em /planos.' })
  @IsString({ message: 'Selecione um plano.' })
  @IsNotEmpty({ message: 'Selecione um plano.' })
  planId: string;

  @ApiProperty({ enum: BILLING_CYCLES })
  @IsIn(BILLING_CYCLES, { message: 'Ciclo de cobrança inválido.' })
  billingCycle: BillingCycleValue;

  @ApiProperty({ enum: BILLING_TYPES })
  @IsIn(BILLING_TYPES, { message: 'Forma de pagamento inválida.' })
  billingType: BillingTypeValue;

  @ApiProperty({ example: '12345678000199' })
  @IsString({ message: 'O CPF/CNPJ deve ser um texto.' })
  @IsNotEmpty({ message: 'O CPF/CNPJ é obrigatório.' })
  @MaxLength(20)
  document: string;

  @ApiProperty({ example: 'Empresa Exemplo Ltda' })
  @IsString({ message: 'O nome deve ser um texto.' })
  @IsNotEmpty({ message: 'O nome é obrigatório.' })
  @MaxLength(200)
  name: string;

  @ApiProperty({ example: 'contato@empresa.com.br' })
  @IsEmail({}, { message: 'E-mail inválido.' })
  @IsNotEmpty({ message: 'O e-mail é obrigatório.' })
  @MaxLength(150)
  email: string;

  @ApiPropertyOptional({ example: '(43) 99999-9999' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({
    description: 'Só pro plano Customizado — módulos escolhidos no montador.',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  moduleIds?: string[];
}
