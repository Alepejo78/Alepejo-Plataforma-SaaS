import {
    IsBooleanString,
    IsOptional,
    IsString,
  } from 'class-validator';
  
  export class LicenseFilterDto {
    @IsOptional()
    @IsString()
    companyId?: string;
  
    @IsOptional()
    @IsString()
    moduleId?: string;
  
    @IsOptional()
    @IsBooleanString()
    active?: string;
  }