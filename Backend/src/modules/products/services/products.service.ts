import {
    ConflictException,
    Injectable,
    NotFoundException,
  } from '@nestjs/common';

  import { PrismaService } from '../../../core/prisma/prisma.service';
  import { attachAuditNames, attachAuditName } from '../../../core/utils/audit-names.util';

  import { InAppNotificationsService } from '../../in-app-notifications/services/in-app-notifications.service';

  import { ProductsRepository } from '../repositories/products.repository';

  import { CreateProductDto } from '../dto/create-product.dto';
  import { UpdateProductDto } from '../dto/update-product.dto';
  import { ProductFilterDto } from '../dto/product-filter.dto';

  @Injectable()
  export class ProductsService {
    constructor(
      private readonly repository: ProductsRepository,
      private readonly prisma: PrismaService,
      private readonly notifications: InAppNotificationsService,
    ) {}

    async create(
      companyId: string,
      createProductDto: CreateProductDto,
      userId: string,
    ) {
      const exists = await this.repository.findByCode(
        companyId,
        createProductDto.code,
      );

      if (exists) {
        throw new ConflictException(
          'Já existe um produto cadastrado com este código.',
        );
      }

      // Código de produto excluído continua ocupado no banco pra
      // sempre (unique não olha deletedAt) — sem isso, recriar com o
      // mesmo código batia direto na constraint e virava erro 500 em
      // vez de restaurar o cadastro antigo (mesmo raciocínio de
      // BusinessPartnersService.create).
      const deleted = await this.repository.findDeletedByCode(
        companyId,
        createProductDto.code,
      );

      if (deleted) {
        return this.repository.restore(
          deleted.id,
          companyId,
          createProductDto,
          userId,
        );
      }

      const created = await this.repository.create(
        companyId,
        createProductDto,
        userId,
      );

      void this.notifications.emit({
        rootCompanyId: companyId,
        type: 'NEW_PRODUCT',
        dedupeKey: `new-product:${created.id}`,
        title: 'Novo produto cadastrado',
        message: `${created.code} — ${created.description} foi cadastrado.`,
        permissionCode: 'product.view',
        linkUrl: '/erp/produtos',
        documentRef: created.code,
        actorUserId: userId,
      });

      return created;
    }

    async findAll(companyId: string, filter: ProductFilterDto) {
      const result = await this.repository.findAll(companyId, filter);

      return {
        ...result,
        data: await attachAuditNames(this.prisma, result.data),
      };
    }

    async findOne(companyId: string, id: string) {
      const product = await this.repository.findById(companyId, id);

      if (!product) {
        throw new NotFoundException(
          'Produto não encontrado.',
        );
      }

      return attachAuditName(this.prisma, product);
    }

    async update(
      companyId: string,
      id: string,
      updateProductDto: UpdateProductDto,
      userId: string,
    ) {
      await this.findOne(companyId, id);

      return this.repository.update(
        id,
        updateProductDto,
        userId,
      );
    }

    async remove(companyId: string, id: string) {
      await this.findOne(companyId, id);

      return this.repository.delete(id);
    }
  }
