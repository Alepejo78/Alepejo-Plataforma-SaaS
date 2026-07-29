import {
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';

import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

export class CreatePermissionDto {
  @ApiProperty({
    example: 'users.create',
  })
  @IsString()
  @IsNotEmpty()
  @Length(3, 150)
  code: string;

  @ApiProperty({
    example: 'Cadastrar Usuário',
  })
  @IsString()
  @IsNotEmpty()
  @Length(3, 150)
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  groupId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiPropertyOptional({
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean = true;
}