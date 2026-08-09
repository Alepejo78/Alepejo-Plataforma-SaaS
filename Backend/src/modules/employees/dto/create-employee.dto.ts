import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  EducationLevel,
  EmployeeStatus,
  Gender,
  MaritalStatus,
  PaymentMethod,
  SalaryType,
} from '@prisma/client';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

import { EmployeeDependentDto } from './employee-dependent.dto';

export class CreateEmployeeDto {
  // --- Pessoais ---
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(150)
  fatherName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(150)
  motherName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional({ enum: Gender })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  birthCity?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2)
  birthState?: string;

  @ApiPropertyOptional({ enum: MaritalStatus })
  @IsOptional()
  @IsEnum(MaritalStatus)
  maritalStatus?: MaritalStatus;

  @ApiPropertyOptional({ enum: EducationLevel })
  @IsOptional()
  @IsEnum(EducationLevel)
  educationLevel?: EducationLevel;

  // --- Documentos ---
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(14)
  cpf?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  rg?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  workCard?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  workCardSeries?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  pis?: string;

  // --- Contato ---
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10)
  zipCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  street?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  number?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  district?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2)
  state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  mobile?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  email?: string;

  // --- Contratuais ---
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  jobFunctionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  workScheduleId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  baseSalary?: number;

  @ApiPropertyOptional({ enum: SalaryType })
  @IsOptional()
  @IsEnum(SalaryType)
  salaryType?: SalaryType;

  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  admissionDate?: string;

  @ApiPropertyOptional({
    description: 'Data em que o período de experiência vence.',
  })
  @IsOptional()
  @IsDateString()
  experienceEndDate?: string;

  @ApiPropertyOptional({
    description: 'Previsão de término, para contratos por prazo.',
  })
  @IsOptional()
  @IsDateString()
  contractEndDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  terminationDate?: string;

  @ApiPropertyOptional({ enum: EmployeeStatus })
  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;

  // --- Saúde ocupacional ---
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  examDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  examCompleted?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  nextExamDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  noticeDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  onLeave?: boolean;

  // --- Benefícios ---
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  transportVoucher?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  lockerKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  lockerNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  observation?: string;

  // --- Dependentes ---
  @ApiPropertyOptional({ type: [EmployeeDependentDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => EmployeeDependentDto)
  dependents?: EmployeeDependentDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean = true;
}
