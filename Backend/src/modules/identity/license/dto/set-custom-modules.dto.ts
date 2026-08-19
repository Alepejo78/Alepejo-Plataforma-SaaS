import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class SetCustomModulesDto {
  @ApiProperty({ type: [String], description: 'Ids dos módulos escolhidos.' })
  @IsArray()
  @IsString({ each: true })
  moduleIds: string[];
}
