import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { Permissions } from '../../identity/auth/decorators/permissions.decorator';

import { WhatsappNotificationsService } from '../services/whatsapp-notifications.service';
import { SendTestWhatsappDto } from '../dto/send-test-whatsapp.dto';

/**
 * Pareamento e status da sessão de WhatsApp (Baileys) — uma sessão
 * POR EMPRESA (mesmo padrão do SMTP em Configurações: cliente novo
 * nasce sem nada pareado). Só admins com `whatsapp.manage` conseguem
 * conectar/desconectar; `whatsapp.view` só consulta o status.
 *
 * Sem `@Module()` de propósito — ver decisão do usuário (10-09-2026):
 * WhatsApp vira item vendável no catálogo/preço do plano customizado,
 * mas SEM travar acesso de verdade nesta entrega, porque toda empresa
 * que já usa WhatsApp hoje (sem módulo nenhum) perderia acesso de
 * uma hora pra outra até alguém conceder o módulo manualmente. Se um
 * dia quiser travar de verdade, precisa antes conceder `WHATSAPP` como
 * `CompanyModule` pra toda empresa que já usa a funcionalidade.
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
  getStatus(
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.service.getStatus(companyId);
  }

  @Post('connect')
  @Permissions('whatsapp.manage')
  @ApiOperation({
    summary: 'Iniciar/retomar a conexão do WhatsApp (gera QR code para parear)',
  })
  connect(
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.service.connect(companyId);
  }

  @Post('logout')
  @Permissions('whatsapp.manage')
  @ApiOperation({
    summary: 'Desconectar e apagar a sessão pareada do WhatsApp',
  })
  logout(
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.service.logout(companyId);
  }

  @Post('test')
  @Permissions('whatsapp.manage')
  @ApiOperation({
    summary: 'Enviar uma mensagem de teste para um número (diagnóstico)',
  })
  async sendTest(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: SendTestWhatsappDto,
  ) {
    return this.service.sendVerbose(
      companyId,
      dto.phone,
      dto.message ??
        'Mensagem de teste do AlePejo ERP — se você recebeu isso, o WhatsApp está funcionando.',
    );
  }
}
