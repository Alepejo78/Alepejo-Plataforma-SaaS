import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../identity/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../identity/auth/guards/permissions.guard';
import { Permissions } from '../../identity/auth/decorators/permissions.decorator';

import { ClientsService } from '../services/clients.service';
import { CreateClientDto } from '../dto/create-client.dto';
import { UpdateClientDto } from '../dto/update-client.dto';
import { ClientFilterDto } from '../dto/client-filter.dto';

@Controller('clients')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ClientsController {
  constructor(
    private readonly clientsService: ClientsService,
  ) {}

  @Post()
  @Permissions('CLIENT_CREATE')
  create(@Body() dto: CreateClientDto) {
    return this.clientsService.create(dto);
  }

  @Get()
  @Permissions('CLIENT_VIEW')
  findAll(@Query() filter: ClientFilterDto) {
    return this.clientsService.findAll(filter);
  }

  @Get(':id')
  @Permissions('CLIENT_VIEW')
  findById(@Param('id') id: string) {
    return this.clientsService.findById(id);
  }

  @Patch(':id')
  @Permissions('CLIENT_UPDATE')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
  ) {
    return this.clientsService.update(id, dto);
  }

  @Delete(':id')
  @Permissions('CLIENT_DELETE')
  remove(@Param('id') id: string) {
    return this.clientsService.remove(id);
  }
}