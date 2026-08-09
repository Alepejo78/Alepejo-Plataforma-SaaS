import { PartialType } from '@nestjs/mapped-types';
import { CreateChartOfAccountClassificationDto } from './create-chart-of-account-classification.dto';

export class UpdateChartOfAccountClassificationDto extends PartialType(
  CreateChartOfAccountClassificationDto,
) {}
