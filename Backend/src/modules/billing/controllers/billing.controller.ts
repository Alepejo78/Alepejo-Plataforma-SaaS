import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Logger,
  Param,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../../../core/decorators/public.decorator';
import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { Permissions } from '../../identity/auth/decorators/permissions.decorator';

import { BillingService } from '../services/billing.service';
import { SubscribeDto } from '../dto/subscribe.dto';
import { CreateCheckoutDto } from '../dto/create-checkout.dto';

@ApiTags('Billing')
@Controller('billing')
export class BillingController {
  private readonly logger = new Logger(BillingController.name);

  constructor(private readonly billingService: BillingService) {}

  @Post('me/subscribe')
  @Permissions('license.view')
  @ApiOperation({
    summary:
      'Contratar/regularizar a assinatura da minha empresa no Asaas',
  })
  subscribe(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: SubscribeDto,
  ) {
    return this.billingService.subscribe(companyId, dto.billingType);
  }

  /**
   * "Comprar agora" de /planos — cobra ANTES do cadastro existir, por
   * isso é público (não há sessão nem empresa ainda). O que protege
   * aqui não é autenticação, é o próprio desenho: só cria cobrança
   * (nada é liberado sem o pagamento cair) e recusa documento que já
   * tem empresa.
   */
  @Public()
  @Post('checkout')
  @ApiOperation({
    summary: 'Iniciar compra de um plano antes do cadastro da empresa',
  })
  createCheckout(@Body() dto: CreateCheckoutDto) {
    return this.billingService.createCheckout(dto);
  }

  @Public()
  @Get('checkout/:id')
  @ApiOperation({
    summary: 'Dados da compra, pra tela de cadastro preencher e travar o plano',
  })
  getCheckout(@Param('id') id: string) {
    return this.billingService.getCheckout(id);
  }

  @Get('customers')
  @Permissions('platform.license.manage')
  @ApiOperation({
    summary: 'Relatório de clientes e faturamento (plataforma) — 12 meses de um ano',
  })
  customers(@Query('year') year?: string) {
    const parsed = year ? Number(year) : NaN;
    const resolvedYear =
      Number.isInteger(parsed) && parsed > 2000
        ? parsed
        : new Date().getFullYear();

    return this.billingService.customerReport(resolvedYear);
  }

  @Get('me/charges')
  @Permissions('license.view')
  @ApiOperation({
    summary: 'Faturas da assinatura da minha empresa',
  })
  charges(@CurrentUser('companyId') companyId: string) {
    return this.billingService.listCharges(companyId);
  }

  /**
   * Pública por natureza (o Asaas chama de fora), mas protegida pelo
   * header `asaas-access-token` — sem ele (ou errado), 401. É a única
   * autenticação possível aqui: não existe sessão de usuário num
   * webhook servidor-a-servidor.
   */
  @Public()
  @Post('webhook')
  @HttpCode(200)
  @ApiOperation({ summary: 'Webhook de eventos de pagamento do Asaas' })
  webhook(
    @Headers() headers: Record<string, string | undefined>,
    @Body() body: { id?: string; event: string; payment?: { id: string } },
  ) {
    const expected = process.env.ASAAS_WEBHOOK_TOKEN;
    const token = headers['asaas-access-token'];

    if (!expected || !token || token !== expected) {
      /*
       * Diagnóstico de 401: sem isso, "o token não bate" é um beco sem
       * saída — não dá pra saber se o cabeçalho chegou, se veio com
       * outro nome ou se o valor é que está diferente. Registra só o
       * TAMANHO dos valores e os nomes dos cabeçalhos; o segredo em si
       * nunca vai pro log, que fica visível pra quem abrir o painel.
       */
      this.logger.warn(
        `Webhook recusado (401). ` +
          `Cabeçalho asaas-access-token ${
            token === undefined ? 'NÃO veio' : `veio com ${token.length} caractere(s)`
          }; ` +
          `ASAAS_WEBHOOK_TOKEN no servidor ${
            expected ? `tem ${expected.length} caractere(s)` : 'NÃO está definido'
          }. ` +
          `Cabeçalhos recebidos: ${Object.keys(headers).join(', ')}`,
      );

      throw new UnauthorizedException('Token de webhook inválido.');
    }

    return this.billingService.handleWebhook(body);
  }
}
