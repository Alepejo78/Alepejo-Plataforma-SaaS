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

import { Permissions } from '../../identity/auth/decorators/permissions.decorator';
import { Module } from '../../identity/license/decorators/module.decorator';

import { CboService } from '../services/cbo.service';
import { CboFilterDto } from '../dto/cbo-filter.dto';
import { CreateCboDto } from '../dto/create-cbo.dto';
import { UpdateCboDto } from '../dto/update-cbo.dto';

@Controller('cbo')
@Module('HR')
export class CboController {
  constructor(private readonly service: CboService) {}

  @Get()
  @Permissions('job-function.view')
  findAll(@Query() filter: CboFilterDto) {
    return this.service.findAll(filter);
  }

  @Post()
  @Permissions('platform.cbo.manage')
  create(@Body() dto: CreateCboDto) {
    return this.service.create(dto);
  }

  @Patch(':code')
  @Permissions('platform.cbo.manage')
  update(@Param('code') code: string, @Body() dto: UpdateCboDto) {
    return this.service.update(code, dto);
  }

  @Delete(':code')
  @Permissions('platform.cbo.manage')
  remove(@Param('code') code: string) {
    return this.service.remove(code);
  }
}
