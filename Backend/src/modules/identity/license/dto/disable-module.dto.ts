import { IsString } from 'class-validator';

export class DisableModuleDto {
  @IsString()
  moduleId!: string;
}
