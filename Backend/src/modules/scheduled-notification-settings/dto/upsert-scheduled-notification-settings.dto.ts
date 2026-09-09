import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpsertScheduledNotificationSettingsDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  announcementHeader?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  announcementFooter?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  examReminderSubject?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  examReminderMessage?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  birthdaySubject?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  birthdayMessage?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  hourBankClosingSubject?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  hourBankClosingMessage?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  pointClosingSubject?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  pointClosingMessage?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  paymentReminderBeforeSubject?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  paymentReminderBeforeMessage?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  paymentReminderOverdueSubject?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  paymentReminderOverdueMessage?: string;
}
