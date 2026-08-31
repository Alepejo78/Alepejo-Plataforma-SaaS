import * as crypto from 'crypto';

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../../core/prisma/prisma.service';
import { EmailNotificationsService } from '../../notifications/services/email-notifications.service';
import { WhatsappNotificationsService } from '../../notifications/services/whatsapp-notifications.service';

import { PpeDeliveriesRepository } from '../repositories/ppe-deliveries.repository';

import { CreatePpeDeliveryDto } from '../dto/create-ppe-delivery.dto';
import { PpeDeliveryFilterDto } from '../dto/ppe-delivery-filter.dto';

/** Validade do link de confirmação — generoso de propósito: EPI não tem pressa de "expirar" como senha, só não fica valendo pra sempre. */
const CONFIRMATION_TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000;

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class PpeDeliveriesService {
  constructor(
    private readonly repository: PpeDeliveriesRepository,
    private readonly prisma: PrismaService,
    private readonly emailNotifications: EmailNotificationsService,
    private readonly whatsappNotifications: WhatsappNotificationsService,
  ) {}

  async create(companyId: string, dto: CreatePpeDeliveryDto) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, companyId },
    });

    if (!employee) {
      throw new NotFoundException(
        'Colaborador não encontrado.',
      );
    }

    const ppeType = await this.prisma.ppeType.findFirst({
      where: { id: dto.ppeTypeId, companyId },
    });

    if (!ppeType) {
      throw new NotFoundException(
        'Tipo de EPI não encontrado.',
      );
    }

    return this.repository.create(companyId, dto);
  }

  async findAll(
    companyId: string,
    filter: PpeDeliveryFilterDto,
  ) {
    return this.repository.findAll(companyId, filter);
  }

  async findOne(companyId: string, id: string) {
    const delivery = await this.repository.findById(
      companyId,
      id,
    );

    if (!delivery) {
      throw new NotFoundException(
        'Entrega de EPI não encontrada.',
      );
    }

    return delivery;
  }

  async remove(companyId: string, id: string) {
    await this.findOne(companyId, id);

    return this.repository.delete(id);
  }

  /** Confirmação manual — alguém do RH, logado na tela, confirma que entregou/assinou na hora. */
  async confirm(companyId: string, id: string, userId: string) {
    const delivery = await this.findOne(companyId, id);

    if (delivery.status === 'CONFIRMADO') {
      throw new BadRequestException(
        'Esta entrega já está confirmada.',
      );
    }

    return this.repository.confirm(id, userId);
  }

  /**
   * Gera (ou renova) o link de confirmação e manda pro colaborador por
   * e-mail e/ou WhatsApp — mesmo padrão best-effort de
   * SalesOrderService.notifyPartner (manda pros dois canais que a
   * empresa tiver cadastrado, nunca lança se um deles falhar).
   */
  async sendConfirmation(companyId: string, id: string) {
    const delivery = await this.findOne(companyId, id);

    if (delivery.status === 'CONFIRMADO') {
      throw new BadRequestException(
        'Esta entrega já está confirmada.',
      );
    }

    const employee = delivery.employee;

    if (!employee.email && !employee.mobile) {
      throw new BadRequestException(
        'Este colaborador não tem e-mail nem celular cadastrado — não há como enviar o link de confirmação.',
      );
    }

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(token);
    const expiresAt = new Date(
      Date.now() + CONFIRMATION_TOKEN_TTL_MS,
    );

    await this.repository.setConfirmationToken(
      id,
      tokenHash,
      expiresAt,
    );

    const frontendUrl =
      process.env.FRONTEND_URL ?? 'http://localhost:3000';
    const link = `${frontendUrl}/confirmar-epi?id=${id}&token=${token}`;
    const companyName =
      delivery.company.tradeName || delivery.company.legalName;
    const ppeTypeName = delivery.ppeType?.name ?? 'EPI';

    const channels: string[] = [];

    if (employee.email) {
      const sent = await this.emailNotifications.send(
        companyId,
        employee.email,
        `Confirmação de recebimento de EPI — ${companyName}`,
        `<p>Olá, ${employee.name},</p>
<p>A <strong>${companyName}</strong> registrou a entrega do EPI <strong>${ppeTypeName}</strong> pra você. Clique no botão abaixo pra confirmar que recebeu:</p>
<p style="text-align: center; margin: 24px 0;">
  <a href="${link}" style="background: #2563eb; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Confirmar recebimento</a>
</p>
<p style="font-size: 13px; color: #666;">Se o botão não funcionar, copie e cole este link no navegador:<br><a href="${link}">${link}</a></p>`,
      );

      if (sent) {
        channels.push('email');
      }
    }

    if (employee.mobile) {
      const sent = await this.whatsappNotifications.send(
        companyId,
        employee.mobile,
        `Olá, ${employee.name}! A ${companyName} registrou a entrega do EPI "${ppeTypeName}" pra você. Confirme que recebeu neste link: ${link}`,
      );

      if (sent) {
        channels.push('whatsapp');
      }
    }

    return { sent: channels.length > 0, channels };
  }

  private async validatePublicToken(id: string, token: string) {
    const delivery = await this.repository.findByIdUnscoped(id);

    if (
      !delivery ||
      !delivery.confirmationTokenHash ||
      !delivery.confirmationTokenExpiresAt ||
      delivery.confirmationTokenExpiresAt < new Date()
    ) {
      throw new BadRequestException(
        'Link de confirmação inválido ou expirado. Peça pro RH enviar um novo.',
      );
    }

    if (hashToken(token) !== delivery.confirmationTokenHash) {
      throw new BadRequestException(
        'Link de confirmação inválido ou expirado. Peça pro RH enviar um novo.',
      );
    }

    return delivery;
  }

  /** Tela pública (sem login) mostra o que vai confirmar antes do clique. */
  async getPublicInfo(id: string, token: string) {
    const delivery = await this.validatePublicToken(id, token);

    return {
      employeeName: delivery.employee.name,
      companyName:
        delivery.company.tradeName || delivery.company.legalName,
      ppeTypeName: delivery.ppeType?.name ?? 'EPI',
      quantity: delivery.quantity,
      deliveryDate: delivery.deliveryDate,
      status: delivery.status,
    };
  }

  /** Consumo público do link — o colaborador confirma sem sessão. */
  async confirmPublic(id: string, token: string) {
    await this.validatePublicToken(id, token);

    await this.repository.confirmByToken(id);

    return { success: true };
  }
}
