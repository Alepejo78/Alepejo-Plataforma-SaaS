import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateCompanyBrandingDto {
  @ApiPropertyOptional({
    example: 'AlePejo ERP Cloud',
    description: 'Nome exibido no lugar do padrão do sistema.',
  })
  @IsOptional()
  @IsString({ message: 'O nome do sistema deve ser um texto.' })
  @MaxLength(40, {
    message: 'O nome do sistema deve ter no máximo 40 caracteres.',
  })
  systemName?: string;

  @ApiPropertyOptional({
    description: 'Usar a logo enviada para o tema claro.',
  })
  @IsOptional()
  @IsBoolean()
  logoLightEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Usar a logo enviada para o tema escuro.',
  })
  @IsOptional()
  @IsBoolean()
  logoDarkEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Usar o nome do sistema personalizado.',
  })
  @IsOptional()
  @IsBoolean()
  systemNameEnabled?: boolean;

  @ApiPropertyOptional({
    description:
      'Mostrar o botão de alternar tema claro/escuro para os usuários.',
  })
  @IsOptional()
  @IsBoolean()
  themeToggleEnabled?: boolean;

  @ApiPropertyOptional({
    example: 'vertical',
    description: 'Layout do menu: "vertical" ou "horizontal".',
  })
  @IsOptional()
  @IsIn(['vertical', 'horizontal'], {
    message: 'O layout do menu deve ser "vertical" ou "horizontal".',
  })
  sidebarLayout?: 'vertical' | 'horizontal';
}
