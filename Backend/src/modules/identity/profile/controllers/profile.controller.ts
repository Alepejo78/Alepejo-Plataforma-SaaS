import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import {
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../../../../core/decorators/current-user.decorator';

import {
  ProfileService,
  avatarDestination,
  avatarFileFilter,
  avatarFilename,
} from '../services/profile.service';

import { UpdateAvatarEnabledDto } from '../dto/update-avatar-enabled.dto';
import { UpdatePreferencesDto } from '../dto/update-preferences.dto';

/**
 * Foto de perfil: autoatendimento (cada usuário só mexe na própria),
 * sem exigir módulo licenciado nem permissão granular — é conta
 * pessoal, não personalização da empresa.
 */
@ApiTags('Identity - Profile')
@Controller('users/me')
export class ProfileController {
  constructor(private readonly service: ProfileService) {}

  @Get('avatar')
  @ApiOperation({ summary: 'Minha foto de perfil' })
  getMine(@CurrentUser('id') userId: string) {
    return this.service.getMine(userId);
  }

  @Patch('avatar')
  @ApiOperation({
    summary: 'Ativar/desativar a foto de perfil',
  })
  setEnabled(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateAvatarEnabledDto,
  ) {
    return this.service.setEnabled(userId, dto.enabled);
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Minha personalização (cor/layout/limite de guias)' })
  getPreferences(@CurrentUser('id') userId: string) {
    return this.service.getPreferences(userId);
  }

  @Patch('preferences')
  @ApiOperation({
    summary: 'Salvar minha personalização — null limpa e volta a usar o padrão da empresa',
  })
  updatePreferences(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdatePreferencesDto,
  ) {
    return this.service.updatePreferences(userId, dto);
  }

  @Post('avatar/photo')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Enviar foto de perfil' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: avatarDestination,
        filename: avatarFilename,
      }),
      fileFilter: avatarFileFilter,
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  uploadAvatar(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.uploadAvatar(userId, file);
  }
}
