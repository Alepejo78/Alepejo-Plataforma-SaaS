import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpsertDocumentTemplateSettingsDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  pdfHeader?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  pdfFooter?: string;
}
