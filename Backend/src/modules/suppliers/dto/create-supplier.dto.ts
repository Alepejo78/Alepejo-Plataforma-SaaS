import {
    IsBoolean,
    IsEmail,
    IsOptional,
    IsString,
    MaxLength,
  } from 'class-validator';
  
  export class CreateSupplierDto {
    @IsString()
    @MaxLength(200)
    corporateName: string;
  
    @IsOptional()
    @IsString()
    @MaxLength(200)
    tradeName?: string;
  
    @IsString()
    @MaxLength(20)
    document: string;
  
    @IsOptional()
    @IsString()
    @MaxLength(30)
    stateRegistration?: string;
  
    @IsOptional()
    @IsString()
    @MaxLength(30)
    municipalRegistration?: string;
  
    @IsOptional()
    @IsEmail()
    email?: string;
  
    @IsOptional()
    @IsString()
    @MaxLength(30)
    phone?: string;
  
    @IsOptional()
    @IsString()
    @MaxLength(30)
    mobile?: string;
  
    @IsOptional()
    @IsString()
    @MaxLength(150)
    contactName?: string;
  
    @IsOptional()
    @IsString()
    @MaxLength(15)
    zipCode?: string;
  
    @IsOptional()
    @IsString()
    @MaxLength(150)
    street?: string;
  
    @IsOptional()
    @IsString()
    @MaxLength(20)
    number?: string;
  
    @IsOptional()
    @IsString()
    @MaxLength(100)
    complement?: string;
  
    @IsOptional()
    @IsString()
    @MaxLength(100)
    district?: string;
  
    @IsOptional()
    @IsString()
    @MaxLength(100)
    city?: string;
  
    @IsOptional()
    @IsString()
    @MaxLength(2)
    state?: string;
  
    @IsOptional()
    @IsString()
    @MaxLength(200)
    website?: string;
  
    @IsOptional()
    @IsString()
    notes?: string;
  
    @IsOptional()
    @IsBoolean()
    active?: boolean;
  }