import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  BusinessPartner,
  BusinessPartnerRole,
} from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';
import { attachAuditNames, attachAuditName } from '../../../core/utils/audit-names.util';

import { BusinessPartnersRepository } from '../repositories/business-partners.repository';

import { CreateBusinessPartnerDto } from '../dto/create-business-partner.dto';
import { UpdateBusinessPartnerDto } from '../dto/update-business-partner.dto';
import { BusinessPartnerFilterDto } from '../dto/business-partner-filter.dto';

@Injectable()
export class BusinessPartnersService {
  constructor(
    private readonly repository: BusinessPartnersRepository,
    private readonly prisma: PrismaService,
  ) {}

  async create(
    companyId: string,
    dto: CreateBusinessPartnerDto,
    userId: string,
  ) {
    const exists = await this.repository.findByDocument(
      companyId,
      dto.document,
    );

    if (exists) {
      throw new ConflictException(
        'Já existe um parceiro cadastrado com este CPF/CNPJ.',
      );
    }

    const deleted = await this.repository.findDeletedByDocument(
      companyId,
      dto.document,
    );

    if (deleted) {
      return this.repository.restore(deleted.id, companyId, {
        ...dto,
        roles: this.normalizeRoles(dto.roles),
      }, userId);
    }

    return this.repository.create(companyId, {
      ...dto,
      roles: this.normalizeRoles(dto.roles),
    }, userId);
  }

  async findAll(
    companyId: string,
    filter: BusinessPartnerFilterDto,
  ) {
    const result = await this.repository.findAll(companyId, filter);

    return {
      ...result,
      data: await attachAuditNames(this.prisma, result.data),
    };
  }

  async findOne(
    companyId: string,
    id: string,
  ) {
    const partner = await this.repository.findById(
      companyId,
      id,
    );

    if (!partner) {
      throw new NotFoundException(
        'Parceiro não encontrado.',
      );
    }

    return attachAuditName(this.prisma, partner);
  }

  async update(
    companyId: string,
    id: string,
    dto: UpdateBusinessPartnerDto,
    userId: string,
  ) {
    const partner = await this.findOne(companyId, id);

    if (dto.document && dto.document !== partner.document) {
      const exists = await this.repository.findByDocument(
        companyId,
        dto.document,
      );

      if (exists && exists.id !== id) {
        throw new ConflictException(
          'Já existe um parceiro cadastrado com este CPF/CNPJ.',
        );
      }
    }

    if (dto.roles) {
      await this.assertRolesCanBeRemoved(
        partner,
        this.normalizeRoles(dto.roles),
      );
    }

    return this.repository.update(id, {
      ...dto,
      ...(dto.roles && {
        roles: this.normalizeRoles(dto.roles),
      }),
    }, userId);
  }

  async remove(companyId: string, id: string) {
    const partner = await this.findOne(companyId, id);

    const [sales, purchases] = await Promise.all([
      this.repository.countSales(partner.id),
      this.repository.countPurchases(partner.id),
    ]);

    if (sales > 0 || purchases > 0) {
      throw new BadRequestException(
        'Este parceiro possui movimentações e não pode ser excluído. ' +
          'Altere o status para Inativo.',
      );
    }

    return this.repository.softDelete(id);
  }

  /**
   * Garante que o parceiro possui o papel exigido por uma operação.
   * Usado por Vendas (CUSTOMER) e Compras (SUPPLIER) para impedir,
   * por exemplo, emitir uma venda para quem é apenas fornecedor.
   */
  async assertHasRole(
    companyId: string,
    id: string,
    role: BusinessPartnerRole,
  ): Promise<BusinessPartner> {
    const partner = await this.findOne(companyId, id);

    if (!partner.roles.includes(role)) {
      throw new BadRequestException(
        `Este parceiro não está cadastrado como ${this.roleLabel(role)}.`,
      );
    }

    if (!partner.active) {
      throw new BadRequestException(
        'Este parceiro está inativo.',
      );
    }

    return partner;
  }

  private normalizeRoles(
    roles: BusinessPartnerRole[],
  ): BusinessPartnerRole[] {
    // Evita papéis repetidos vindos do formulário.
    return Array.from(new Set(roles));
  }

  /**
   * Impede remover um papel que ainda tem movimentação vinculada:
   * uma venda perderia o cliente, uma compra perderia o fornecedor.
   */
  private async assertRolesCanBeRemoved(
    partner: BusinessPartner,
    newRoles: BusinessPartnerRole[],
  ): Promise<void> {
    const lostCustomer =
      partner.roles.includes(BusinessPartnerRole.CUSTOMER) &&
      !newRoles.includes(BusinessPartnerRole.CUSTOMER);

    if (lostCustomer) {
      const sales = await this.repository.countSales(
        partner.id,
      );

      if (sales > 0) {
        throw new BadRequestException(
          `Não é possível remover o papel de cliente: existem ${sales} venda(s) vinculada(s).`,
        );
      }
    }

    const lostSupplier =
      partner.roles.includes(BusinessPartnerRole.SUPPLIER) &&
      !newRoles.includes(BusinessPartnerRole.SUPPLIER);

    if (lostSupplier) {
      const purchases =
        await this.repository.countPurchases(partner.id);

      if (purchases > 0) {
        throw new BadRequestException(
          `Não é possível remover o papel de fornecedor: existem ${purchases} compra(s) vinculada(s).`,
        );
      }
    }
  }

  private roleLabel(role: BusinessPartnerRole): string {
    const labels: Record<BusinessPartnerRole, string> = {
      CUSTOMER: 'cliente',
      SUPPLIER: 'fornecedor',
      CARRIER: 'transportadora',
      SALES_REP: 'vendedor/representante',
    };

    return labels[role];
  }
}
