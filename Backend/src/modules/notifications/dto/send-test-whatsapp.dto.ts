import { IsOptional, IsString, MinLength } from 'class-validator';

export class SendTestWhatsappDto {
  @IsString()
  @MinLength(8)
  phone: string;

  @IsOptional()
  @IsString()
  message?: string;
}
