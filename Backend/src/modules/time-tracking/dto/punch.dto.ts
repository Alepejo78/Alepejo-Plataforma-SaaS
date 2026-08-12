import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

/**
 * Payload de dispositivo externo (relógio de ponto, leitor de QR/
 * código de barras) — autenticado por chave de API, não por login.
 * `employeeId` é o conteúdo lido do QR/código de barras (o próprio id
 * do colaborador, sem campo novo de "matrícula").
 */
export class PunchDto {
  @ApiProperty()
  @IsString()
  employeeId: string;

  @ApiProperty({
    required: false,
    description: 'Sem informar, usa o horário do servidor agora.',
  })
  @IsOptional()
  @IsDateString()
  timestamp?: string;
}
