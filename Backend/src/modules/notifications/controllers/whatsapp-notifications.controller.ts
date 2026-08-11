import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Permissions } from '../../identity/auth/decorators/permissions.decorator';

import { WhatsappNotificationsService } from '../services/whatsapp-notifications.service';
import { SendTestWhatsappDto } from '../dto/send-test-whatsapp.dto';

/**
 * Pareamento e status da sessão de WhatsApp (Baileys) — sessão única,
 * global ao sistema (não é por empresa, mesmo padrão do SMTP em
 * Configurações). Só admins com `whatsapp.manage` conseguem
 * conectar/desconectar; `whatsapp.view` só consulta o status.
 */
@ApiTags('Notifications - WhatsApp')
@Controller('notifications/whatsapp')
export class WhatsappNotificationsController {
  constructor(
    private readonly service: WhatsappNotificationsService,
  ) {}

  @Get('status')
  @Permissions('whatsapp.view')
  @ApiOperation({
    summary: 'Status da conexão do WhatsApp (e QR code, se aguardando pareamento)',
  })
  getStatus() {
    return this.service.getStatus();
  }

  @Post('connect')
  @Permissions('whatsapp.manage')
  @ApiOperation({
    summary: 'Iniciar/retomar a conexão do WhatsApp (gera QR code para parear)',
  })
  connect() {
    return this.service.connect();
  }

  @Post('logout')
  @Permissions('whatsapp.manage')
  @ApiOperation({
    summary: 'Desconectar e apagar a sessão pareada do WhatsApp',
  })
  logout() {
    return this.service.logout();
  }

  @Post('test')
  @Permissions('whatsapp.manage')
  @ApiOperation({
    summary: 'Enviar uma mensagem de teste para um número (diagnóstico)',
  })
  async sendTest(@Body() dto: SendTestWhatsappDto) {
    return this.service.sendVerbose(
      dto.phone,
      dto.message ??
        'Mensagem de teste do AlePejo ERP — se você recebeu isso, o WhatsApp está funcionando.',
    );
  }
}
