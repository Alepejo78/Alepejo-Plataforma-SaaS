import {
  BadGatewayException,
  Body,
  Controller,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { Public } from '../../../core/decorators/public.decorator';
import { EmailNotificationsService } from '../../notifications/services/email-notifications.service';
import { ContactDto } from '../dto/contact.dto';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Sem empresa dona (é o site público) — usa o SMTP global do `.env`
 * (mesmo fallback de `EmailNotificationsService.resolveConfig`,
 * companyId inexistente cai direto nele) e manda pro próprio e-mail
 * cadastrado no SMTP, que é quem hoje responde pelos contatos comerciais.
 */
const PUBLIC_SITE_COMPANY_ID = 'public-site';

@ApiTags('Marketing')
@Controller('contact')
export class ContactController {
  constructor(
    private readonly emailNotifications: EmailNotificationsService,
  ) {}

  @Public()
  @Post()
  @ApiOperation({ summary: 'Enviar mensagem de contato (site público)' })
  @ApiResponse({ status: 201, description: 'Mensagem enviada.' })
  @ApiResponse({
    status: 502,
    description: 'Não foi possível enviar — tente novamente mais tarde.',
  })
  async submit(@Body() dto: ContactDto) {
    const recipient = process.env.SMTP_USER;

    if (!recipient) {
      throw new BadGatewayException(
        'Envio de contato não configurado.',
      );
    }

    const html = `
      <h2>Novo contato pelo site</h2>
      <p><strong>Nome:</strong> ${escapeHtml(dto.name)}</p>
      <p><strong>E-mail:</strong> ${escapeHtml(dto.email)}</p>
      ${dto.phone ? `<p><strong>Telefone:</strong> ${escapeHtml(dto.phone)}</p>` : ''}
      ${dto.company ? `<p><strong>Empresa:</strong> ${escapeHtml(dto.company)}</p>` : ''}
      <p><strong>Mensagem:</strong></p>
      <p>${escapeHtml(dto.message).replace(/\n/g, '<br>')}</p>
    `;

    const result = await this.emailNotifications.sendVerbose(
      PUBLIC_SITE_COMPANY_ID,
      recipient,
      `Novo contato: ${dto.name}`,
      html,
    );

    if (!result.sent) {
      throw new BadGatewayException(
        'Não foi possível enviar sua mensagem agora — tente novamente mais tarde.',
      );
    }

    return { sent: true };
  }
}
