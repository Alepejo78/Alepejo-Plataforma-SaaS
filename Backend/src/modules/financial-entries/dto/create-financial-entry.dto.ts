import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

import {
  FinancialDocumentType,
  FinancialEntryType,
  PaymentMethod,
} from '@prisma/client';

import { InstallmentDto } from '../../../core/dto/installment.dto';

export class CreateFinancialEntryDto {
  @IsEnum(FinancialEntryType)
  type: FinancialEntryType;

  /// Cliente/fornecedor OU colaborador (folha) — exatamente um dos
  /// dois, nunca os dois nem nenhum (ver CHECK no banco).
  @ValidateIf((dto) => !dto.employeeId)
  @IsString({ message: 'Informe o parceiro ou o colaborador.' })
  partnerId?: string;

  @ValidateIf((dto) => !dto.partnerId)
  @IsString({ message: 'Informe o parceiro ou o colaborador.' })
  employeeId?: string;

  @IsString({ message: 'Informe o tipo de despesa/receita.' })
  chartOfAccountId: string;

  /// Produto ou serviço do lançamento — todo título tem que sair
  /// vinculado a algo (decisão do usuário, 26-08-2026).
  @IsString({ message: 'Informe o produto ou serviço.' })
  productId: string;

  @IsDateString()
  issueDate: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  termDays?: number;

  /// Obrigatório só quando não vier `installments` — parcelado, cada
  /// parcela tem seu próprio vencimento.
  @ValidateIf((dto) => !dto.installments || dto.installments.length === 0)
  @IsDateString()
  dueDate?: string;

  /// Parcelamento — cada parcela vira um título próprio, com
  /// vencimento e valor editáveis livremente (não precisa ser em
  /// dias corridos iguais). Quando informado, `dueDate`/`amount`
  /// acima são ignorados.
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InstallmentDto)
  installments?: InstallmentDto[];

  @IsOptional()
  @IsString()
  @MaxLength(50)
  documentNumber?: string;

  @IsOptional()
  @IsEnum(FinancialDocumentType)
  documentType?: FinancialDocumentType;

  /// Chave de acesso da nota fiscal eletrônica (44 dígitos).
  @IsOptional()
  @IsString()
  @MaxLength(50)
  documentKey?: string;

  /// Obrigatório só quando não vier `installments` (ver acima).
  @ValidateIf((dto) => !dto.installments || dto.installments.length === 0)
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  amount?: number;

  @IsEnum(PaymentMethod, { message: 'Informe a forma de pagamento.' })
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observation?: string;
}
