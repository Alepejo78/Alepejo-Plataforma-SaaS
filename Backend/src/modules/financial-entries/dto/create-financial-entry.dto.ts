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
import { FinancialEntryItemDto } from '../../../core/dto/financial-entry-item.dto';

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

  /// Obrigatório só quando não vier `items` (mais de um produto/
  /// serviço) — nesse caso a conta de cada item é que vale, este
  /// campo vira só um resumo (item de maior valor).
  @ValidateIf((dto) => !dto.items || dto.items.length === 0)
  @IsString({ message: 'Informe o tipo de despesa/receita.' })
  chartOfAccountId?: string;

  /// Produto ou serviço do lançamento — todo título tem que sair
  /// vinculado a algo (decisão do usuário, 26-08-2026). Obrigatório
  /// só quando não vier `items` — mesmo raciocínio de
  /// `chartOfAccountId` acima.
  @ValidateIf((dto) => !dto.items || dto.items.length === 0)
  @IsString({ message: 'Informe o produto ou serviço.' })
  productId?: string;

  /// Mais de um produto/serviço no mesmo título (ver
  /// `FinancialEntry.items`) — cada item com sua própria conta
  /// contábil/produto/valor. Quando informado, `productId`/
  /// `chartOfAccountId`/`amount` acima são só um resumo (preenchidos
  /// a partir do item de maior valor), o valor de verdade é a soma
  /// dos itens. Parcelado (`installments` também informado): cada
  /// parcela recebe os mesmos itens, com o valor de cada um dividido
  /// proporcionalmente.
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => FinancialEntryItemDto)
  items?: FinancialEntryItemDto[];

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

  /// Obrigatório só quando não vier `installments` nem `items` — nos
  /// dois casos o valor de verdade é calculado (soma das parcelas ou
  /// dos itens).
  @ValidateIf(
    (dto) =>
      (!dto.installments || dto.installments.length === 0) &&
      (!dto.items || dto.items.length === 0),
  )
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  amount?: number;

  @IsEnum(PaymentMethod, { message: 'Informe a forma de pagamento.' })
  paymentMethod: PaymentMethod;

  /// Diferença entre bruto e líquido, quando a origem do título traz
  /// os dois valores (ex.: importação de orçamento de oficina) — só
  /// informativo, não entra na conta de `amount`.
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discountValue?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observation?: string;
}
