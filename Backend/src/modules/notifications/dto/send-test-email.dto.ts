import { IsEmail, IsOptional, IsString } from 'class-validator';

export class SendTestEmailDto {
  @IsEmail({}, { message: 'E-mail inválido.' })
  to: string;

  @IsOptional()
  @IsString()
  message?: string;
}
