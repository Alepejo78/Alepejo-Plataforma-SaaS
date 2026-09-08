import { Module } from '@nestjs/common';

import { PrismaModule } from '../../core/prisma/prisma.module';
import { DefaultAccountingModule } from '../../core/default-accounting/default-accounting.module';

import { BillingController } from './controllers/billing.controller';
import { BillingService } from './services/billing.service';
import { AsaasService } from './services/asaas.service';

@Module({
  imports: [PrismaModule, DefaultAccountingModule],
  controllers: [BillingController],
  providers: [BillingService, AsaasService],
  // AsaasService também é usado fora deste módulo (ex.:
  // CompanyDeletionService, pra cancelar a assinatura antes de excluir
  // a empresa) — precisa estar exportado pra outro módulo poder
  // injetar. BillingService também: CompanyOnboardingService usa
  // listCharges() logo após o cadastro pra já gerar o título da
  // primeira cobrança, sem esperar o cliente abrir a tela de Cobranças.
  exports: [AsaasService, BillingService],
})
export class BillingModule {}
