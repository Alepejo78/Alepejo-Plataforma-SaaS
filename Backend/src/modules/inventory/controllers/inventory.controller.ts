import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
  } from '@nestjs/common';

  import { CurrentUser } from '../../../core/decorators/current-user.decorator';
  import { Permissions } from '../../identity/auth/decorators/permissions.decorator';

  import { InventoryService } from '../services/inventory.service';

  import { CreateInventoryDto } from '../dto/create-inventory.dto';
  import { UpdateInventoryDto } from '../dto/update-inventory.dto';
  import { InventoryFilterDto } from '../dto/inventory-filter.dto';

  @Controller('inventory')
  export class InventoryController {
    constructor(
      private readonly inventoryService: InventoryService,
    ) {}

    @Post()
    @Permissions('inventory.create')
    async create(
      @CurrentUser('companyId') companyId: string,
      @Body()
      createInventoryDto: CreateInventoryDto,
    ) {
      return this.inventoryService.create(
        companyId,
        createInventoryDto,
      );
    }

    @Get()
    @Permissions('inventory.view')
    async findAll(
      @CurrentUser('companyId') companyId: string,
      @Query()
      filter: InventoryFilterDto,
    ) {
      return this.inventoryService.findAll(
        companyId,
        filter,
      );
    }

    @Get(':id')
    @Permissions('inventory.view')
    async findById(
      @CurrentUser('companyId') companyId: string,
      @Param('id')
      id: string,
    ) {
      return this.inventoryService.findById(
        companyId,
        id,
      );
    }

    @Patch(':id')
    @Permissions('inventory.update')
    async update(
      @CurrentUser('companyId') companyId: string,
      @Param('id')
      id: string,

      @Body()
      updateInventoryDto: UpdateInventoryDto,
    ) {
      return this.inventoryService.update(
        companyId,
        id,
        updateInventoryDto,
      );
    }

    @Delete(':id')
    @Permissions('inventory.delete')
    async remove(
      @CurrentUser('companyId') companyId: string,
      @Param('id')
      id: string,
    ) {
      await this.inventoryService.remove(companyId, id);

      return {
        success: true,
        message:
          'Registro de estoque removido com sucesso.',
      };
    }
  }
