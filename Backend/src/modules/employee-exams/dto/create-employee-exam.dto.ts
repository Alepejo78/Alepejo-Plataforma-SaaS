import { IsDateString, IsNotEmpty, IsString } from 'class-validator';

export class CreateEmployeeExamDto {
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @IsDateString()
  examDate: string;
}
