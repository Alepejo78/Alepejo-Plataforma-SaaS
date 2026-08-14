import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  BankAccountType,
  EducationLevel,
  EmployeeStatus,
  Gender,
  MaritalStatus,
  PaymentMethod,
  PixKeyType,
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
import { EmployeeBenefitDto } from './employee-benefit.dto';

export class CreateEmployeeDto {
  @ApiPropertyOptional({
    description:
      'Empresa do grupo a que este colaborador pertence — ausente usa a empresa ativa da sessão. Precisa pertencer ao mesmo grupo de quem está cadastrando.',
  })
  @IsOptional()
  @IsString()
  companyId?: string;

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
    description:
      'Estágio do período de experiência em dias (30, 60 ou 90). Avança sozinho conforme o prazo vence.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  experienceStageDays?: number;

  @ApiPropertyOptional({
    description:
      'Data em que o período de experiência vence — calculada a partir da admissão + estágio, não editável diretamente.',
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

  @ApiPropertyOptional({
    description:
      'Código/crachá pra bater ponto (módulo LABOR) — o que vai no QR/código de barras do colaborador.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  badgeCode?: string;

  @ApiPropertyOptional({
    description:
      'Usuário de login vinculado a este colaborador (autoatendimento — ex.: Ponto - Manual).',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  // --- Dados bancários ---
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  bankName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  bankAgency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  bankAccount?: string;

  @ApiPropertyOptional({ enum: BankAccountType })
  @IsOptional()
  @IsEnum(BankAccountType)
  bankAccountType?: BankAccountType;

  @ApiPropertyOptional({ enum: PixKeyType })
  @IsOptional()
  @IsEnum(PixKeyType)
  pixKeyType?: PixKeyType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(150)
  pixKey?: string;

  // --- Saúde ocupacional ---
  @ApiPropertyOptional({
    description:
      'Data do próximo exame pendente — gerenciada pelo módulo de exames (EmployeeExam), não editável direto aqui.',
  })
  @IsOptional()
  @IsDateString()
  nextExamDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  noticeDays?: number;

  @ApiPropertyOptional({
    description:
      'Dias de antecedência do aviso de exame por e-mail/WhatsApp (além do aviso fixo de 3 dias e do aviso no dia).',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  examReminderDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  onLeave?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  leaveStartDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  leaveDays?: number;

  @ApiPropertyOptional({
    description:
      'Fim do afastamento — calculado no backend (início + dias), não editável direto aqui.',
  })
  @IsOptional()
  @IsDateString()
  leaveEndDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  vacationStartDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  vacationDays?: number;

  @ApiPropertyOptional({
    description:
      'Fim das férias — calculado no backend (início + dias), não editável direto aqui.',
  })
  @IsOptional()
  @IsDateString()
  vacationEndDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  onVacation?: boolean;

  // --- Benefícios (catálogo dinâmico) ---
  @ApiPropertyOptional({ type: [EmployeeBenefitDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => EmployeeBenefitDto)
  benefits?: EmployeeBenefitDto[];

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
  @MaxLength(10)
  shoeSize?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10)
  shirtSize?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10)
  pantsSize?: string;

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
