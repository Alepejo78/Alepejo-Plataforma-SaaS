import { Body, Controller, Get, Put, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { Permissions } from '../../identity/auth/decorators/permissions.decorator';

import { EmailSettingsService } from '../services/email-settings.service';
import { UpdateEmailSettingsDto } from '../dto/update-email-settings.dto';
import { SendTestEmailDto } from '../dto/send-test-email.dto';

/**
 * Configuração de SMTP própria de cada empresa (aba "Configuração
 * E-mail" em Configurações) — diferente do WhatsApp, que é sessão
 * única global ao sistema.
 */
@ApiTags('Notifications - Email Settings')
@Controller('notifications/email')
export class EmailSettingsController {
  constructor(
    private readonly service: EmailSettingsService,
  ) {}

  @Get('settings')
  @Permissions('email.view')
  @ApiOperation({
    summary: 'Consultar configuração de SMTP da empresa',
  })
  getSettings(
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.service.getSettings(companyId);
  }

  @Put('settings')
  @Permissions('email.manage')
  @ApiOperation({
    summary: 'Salvar configuração de SMTP da empresa',
  })
  updateSettings(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: UpdateEmailSettingsDto,
  ) {
    return this.service.updateSettings(companyId, dto);
  }

  @Post('test')
  @Permissions('email.manage')
  @ApiOperation({
    summary: 'Enviar um e-mail de teste (diagnóstico)',
  })
  sendTest(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: SendTestEmailDto,
  ) {
    return this.service.sendTest(companyId, dto.to, dto.message);
  }
}
