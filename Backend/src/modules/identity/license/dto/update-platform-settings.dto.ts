import { IsInt, Max, Min } from 'class-validator';

export class UpdatePlatformSettingsDto {
  @IsInt()
  @Min(1)
  @Max(365)
  trialDays!: number;
}
