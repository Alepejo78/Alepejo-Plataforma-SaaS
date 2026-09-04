import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';

export class UpsertPaymentReminderSettingsDto {
  @ApiProperty({
    required: false,
    description: 'Avisa o cliente X dias antes do vencimento.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  daysBeforeDue?: number;

  @ApiProperty({
    required: false,
    description: 'Avisa o cliente de novo quando completar X dias vencido.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  daysAfterDue?: number;
}
