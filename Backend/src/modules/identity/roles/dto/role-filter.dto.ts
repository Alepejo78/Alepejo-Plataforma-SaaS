import {
    IsBoolean,
    IsIn,
    IsNumberString,
    IsOptional,
    IsString,
  } from 'class-validator';
  
  import { Transform } from 'class-transformer';
  
  export class RoleFilterDto {
    @IsOptional()
    @IsString()
    search?: string;
  
    @IsOptional()
    @Transform(({ value }) => {
      if (value === undefined) return undefined;
      return value === 'true' || value === true;
    })
    @IsBoolean()
    active?: boolean;
  
    @IsOptional()
    @IsNumberString()
    page?: string = '1';

    @IsOptional()
    @IsNumberString()
    limit?: string = '20';
  
    @IsOptional()
    @IsIn([
      'code',
      'name',
      'createdAt',
      'updatedAt',
    ])
    orderBy?: string = 'name';
  
    @IsOptional()
    @IsIn([
      'asc',
      'desc',
    ])
    orderDirection?: 'asc' | 'desc' = 'asc';
  }