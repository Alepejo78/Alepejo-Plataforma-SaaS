import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { TimeEntrySource } from '@prisma/client';

import { Public } from '../../../core/decorators/public.decorator';

import { TimeClockApiKeyGuard } from '../guards/time-clock-api-key.guard';
import { TimeClockCompany } from '../decorators/time-clock-company.decorator';

import { TimeTrackingService } from '../services/time-tracking.service';

import { PunchDto } from '../dto/punch.dto';

/**
 * Rota pública (autenticada por chave de API, não por login) pra
 * dispositivo externo bater ponto — relógio de ponto físico, leitor
 * de QR/código de barras. Ver TimeClockApiKeyGuard.
 */
@ApiTags('Time Clock (device)')
@Controller('time-clock')
@Public()
@UseGuards(TimeClockApiKeyGuard)
export class TimeClockPunchController {
  constructor(private readonly service: TimeTrackingService) {}

  @Post('punch')
  @ApiOperation({
    summary: 'Registrar batida de ponto vinda de dispositivo externo',
  })
  punch(
    @TimeClockCompany() companyId: string,
    @Body() dto: PunchDto,
  ) {
    return this.service.createEntry(companyId, {
      employeeId: dto.employeeId,
      timestamp: dto.timestamp,
      source: TimeEntrySource.API,
    });
  }
}
