import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

/** Sem `apiKey`, testa a chave já salva. Com `apiKey`, testa a que acabou de ser digitada (antes de salvar). */
export class TestAsaasConnectionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  apiKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  sandbox?: boolean;
}
