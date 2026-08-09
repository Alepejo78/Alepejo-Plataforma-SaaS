import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateFinancialEntryDto } from './create-financial-entry.dto';

/**
 * O tipo (a pagar / a receber) não muda depois de criado: seria trocar
 * a natureza do título. Para isso, cancele e lance de novo.
 */
export class UpdateFinancialEntryDto extends PartialType(
  OmitType(CreateFinancialEntryDto, ['type'] as const),
) {}
