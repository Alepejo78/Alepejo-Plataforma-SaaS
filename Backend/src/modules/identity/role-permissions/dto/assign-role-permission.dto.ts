import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  PermissionEffect,
} from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsString,
} from 'class-validator';

export class AssignRolePermissionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  roleId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  permissionId: string;

  @ApiPropertyOptional({
    enum: PermissionEffect,
    default: PermissionEffect.ALLOW,
  })
  @IsEnum(PermissionEffect)
  effect: PermissionEffect = PermissionEffect.ALLOW;
}