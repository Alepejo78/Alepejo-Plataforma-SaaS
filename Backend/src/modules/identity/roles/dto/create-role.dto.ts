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
  
  export class CreateRoleDto {
    @ApiProperty({
      example: 'ADMIN',
    })
    @IsString()
    @IsNotEmpty()
    @Length(2, 50)
    code: string;
  
    @ApiProperty({
      example: 'Administrador',
    })
    @IsString()
    @IsNotEmpty()
    @Length(3, 100)
    name: string;
  
    @ApiPropertyOptional({
      example: 'Perfil com acesso total ao sistema.',
    })
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