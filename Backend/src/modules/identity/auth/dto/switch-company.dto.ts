import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SwitchCompanyDto {
  @ApiProperty({
    example: 'clx1y2z3a0000qwer1234asdf',
  })
  @IsString()
  @IsNotEmpty()
  companyId: string;
}
