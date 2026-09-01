import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, Matches, Max, Min } from 'class-validator';

/**
 * Nulo/omitido = "sem preferência própria, usa o padrão da empresa"
 * (ver ProfileService.getPreferences / jwt.strategy.ts).
 */
export class UpdatePreferencesDto {
  @ApiPropertyOptional({ description: 'Cor em hex (#RRGGBB) — null limpa a preferência.' })
  @IsOptional()
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'Cor deve estar no formato #RRGGBB.' })
  brandColor?: string | null;

  @ApiPropertyOptional({ enum: ['vertical', 'horizontal'] })
  @IsOptional()
  @IsIn(['vertical', 'horizontal'])
  sidebarLayout?: 'vertical' | 'horizontal' | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  maxOpenTabs?: number | null;
}
