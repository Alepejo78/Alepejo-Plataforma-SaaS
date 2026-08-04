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
import { AuthenticatedUser } from '../../identity/auth/interfaces/authenticated-user.interface';

import { ClientsService } from '../services/clients.service';
import { CreateClientDto } from '../dto/create-client.dto';
import { UpdateClientDto } from '../dto/update-client.dto';
import { ClientFilterDto } from '../dto/client-filter.dto';

@Controller('clients')
export class ClientsController {
  constructor(
    private readonly clientsService: ClientsService,
  ) {}

  @Post()
  @Permissions('client.create')
  create(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: CreateClientDto,
  ) {
    return this.clientsService.create(companyId, dto);
  }

  @Get()
  @Permissions('client.view')
  findAll(
    @CurrentUser('companyId') companyId: string,
    @Query() filter: ClientFilterDto,
  ) {
    return this.clientsService.findAll(companyId, filter);
  }

  @Get(':id')
  @Permissions('client.view')
  findById(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.clientsService.findById(companyId, id);
  }

  @Patch(':id')
  @Permissions('client.update')
  update(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
  ) {
    return this.clientsService.update(companyId, id, dto);
  }

  @Delete(':id')
  @Permissions('client.delete')
  remove(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.clientsService.remove(companyId, id);
  }
}
