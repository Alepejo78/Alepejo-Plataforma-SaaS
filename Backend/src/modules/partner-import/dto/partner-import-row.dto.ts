import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
} from 'class-validator';

import {
  BusinessPartnerRole,
  BusinessPartnerStatus,
  PersonType,
} from '@prisma/client';

/** Uma linha já validada no `/parse`, pronta pra gravar no `/confirm`. */
export class PartnerImportRowDto {
  @ApiProperty({ enum: ['create', 'update'] })
  @IsIn(['create', 'update'])
  action: 'create' | 'update';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  existingId?: string;

  @ApiProperty()
  @IsString()
  document: string;

  @ApiProperty({ enum: BusinessPartnerRole, isArray: true })
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(BusinessPartnerRole, { each: true })
  roles: BusinessPartnerRole[];

  @ApiProperty()
  @IsString()
  legalName: string;

  @ApiProperty({ enum: PersonType, required: false })
  @IsOptional()
  @IsEnum(PersonType)
  personType?: PersonType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  tradeName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  stateRegistration?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  mobile?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  contactName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  zipCode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  street?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  number?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  complement?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ enum: BusinessPartnerStatus, required: false })
  @IsOptional()
  @IsEnum(BusinessPartnerStatus)
  status?: BusinessPartnerStatus;
}
