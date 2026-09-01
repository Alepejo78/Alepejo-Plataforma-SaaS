import { ApiPropertyOptional } from '@nestjs/swagger';
import { BankAccountType, PixKeyType } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateBankAccountDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  description: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  bankName: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  agency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  accountNumber?: string;

  @ApiPropertyOptional({ enum: BankAccountType })
  @IsOptional()
  @IsEnum(BankAccountType)
  accountType?: BankAccountType;

  @ApiPropertyOptional({ enum: PixKeyType })
  @IsOptional()
  @IsEnum(PixKeyType)
  pixKeyType?: PixKeyType;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  pixKey?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean = true;
}
