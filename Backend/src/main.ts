import {
  BadRequestException,
  ValidationPipe,
} from '@nestjs/common';
import type { ValidationError } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { join } from 'path';

import { AppModule } from './app.module';

import { HttpExceptionFilter } from './core/filters/http-exception.filter';
import { ResponseInterceptor } from './core/interceptors/response.interceptor';

async function bootstrap() {
  const app =
    await NestFactory.create<NestExpressApplication>(AppModule);

  app.setGlobalPrefix('api');

  app.use(cookieParser());

  // Logos enviadas pelo módulo de personalização (BRANDING). Fora do
  // prefixo /api de propósito: são arquivos estáticos, não rotas da API.
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  // CORS precisa listar as origens explicitamente: com `origin: '*'`
  // o navegador se recusa a enviar cookies (credentials), o que
  // quebraria a autenticação via cookie httpOnly.
  const allowedOrigins = (
    process.env.CORS_ORIGINS ?? 'http://localhost:3000'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,

      // As mensagens padrão do class-validator e do próprio
      // ValidationPipe saem em inglês (ex.: "name must be a string").
      // Traduzimos por TIPO DE REGRA aqui, num lugar só, em vez de
      // repetir `message:` em cada decorator de cada DTO.
      //
      // Mensagens personalizadas escritas nos DTOs são preservadas:
      // as mensagens padrão sempre seguem o formato
      // "<campo> must ..." / "<campo> should ...", então é isso que
      // usamos para distinguir uma da outra.
      exceptionFactory: (errors) => {
        const ehMensagemPadrao = (mensagem: string) =>
          /^\w+ (must|should) /.test(mensagem);

        const traduzirPorRegra = (
          chave: string,
          campo: string,
          mensagem: string,
        ): string => {
          switch (chave) {
            case 'whitelistValidation':
              return `O campo "${campo}" não é permitido.`;

            case 'isString':
              return `${campo} deve ser um texto.`;

            case 'isNotEmpty':
              return `${campo} é obrigatório.`;

            case 'isEmail':
              return `${campo} deve ser um e-mail válido.`;

            case 'isInt':
            case 'isNumber':
              return `${campo} deve ser um número.`;

            case 'isBoolean':
              return `${campo} deve ser verdadeiro ou falso.`;

            case 'isDateString':
              return `${campo} deve ser uma data válida.`;

            case 'isUuid':
              return `${campo} tem um identificador inválido.`;

            case 'isEnum':
              return `${campo} possui um valor inválido.`;

            case 'isArray':
              return `${campo} deve ser uma lista.`;

            case 'arrayMinSize':
              return `${campo}: selecione ao menos um item.`;

            case 'maxLength': {
              const limite = mensagem.match(/(\d+)/)?.[1];

              return `${campo} deve ter no máximo ${limite} caracteres.`;
            }

            case 'minLength': {
              const limite = mensagem.match(/(\d+)/)?.[1];

              return `${campo} deve ter no mínimo ${limite} caracteres.`;
            }

            case 'max': {
              const limite = mensagem.match(/(\d+)/)?.[1];

              return `${campo} deve ser no máximo ${limite}.`;
            }

            case 'min': {
              const limite = mensagem.match(/(\d+)/)?.[1];

              return `${campo} deve ser no mínimo ${limite}.`;
            }

            default:
              return `${campo} é inválido.`;
          }
        };

        const traduzir = (
          campo: string,
          constraints?: Record<string, string>,
        ) => {
          if (!constraints) {
            return [];
          }

          return Object.entries(constraints).map(
            ([chave, mensagem]) => {
              if (chave === 'whitelistValidation') {
                const naoPermitido = mensagem
                  .replace('property ', '')
                  .replace(' should not exist', '');

                return traduzirPorRegra(
                  chave,
                  naoPermitido,
                  mensagem,
                );
              }

              // Mensagem personalizada do DTO: manter como está.
              if (!ehMensagemPadrao(mensagem)) {
                return mensagem;
              }

              return traduzirPorRegra(chave, campo, mensagem);
            },
          );
        };

        const coletar = (
          lista: ValidationError[],
        ): string[] =>
          lista.flatMap((erro) => [
            ...traduzir(erro.property, erro.constraints),
            ...coletar(erro.children ?? []),
          ]);

        return new BadRequestException(coletar(errors));
      },
    }),
  );

  app.useGlobalInterceptors(
    new ResponseInterceptor(),
  );

  app.useGlobalFilters(
    new HttpExceptionFilter(),
  );

  // Observação: os guards globais (JwtAuthGuard, LicenseGuard,
  // PermissionsGuard) são registrados via APP_GUARD em app.module.ts,
  // não aqui. Registrá-los também com `app.useGlobalGuards()` fazia
  // cada request passar pelos guards de autenticação DUAS VEZES.

  const config = new DocumentBuilder()
    .setTitle('AlePejo ERP API')
    .setDescription(
      'Documentação oficial da API do AlePejo ERP Cloud',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        in: 'header',
      },
      'JWT',
    )
    // Aplica o esquema 'JWT' a TODAS as operações do documento.
    // Evita ter que repetir @ApiBearerAuth('JWT') em cada controller
    // (e evita o bug de usar @ApiBearerAuth() sem nome, que aponta
    // para o esquema 'bearer' inexistente e nunca envia o token).
    .addSecurityRequirements('JWT')
    .build();

  const document =
    SwaggerModule.createDocument(
      app,
      config,
    );

  SwaggerModule.setup(
    'docs',
    app,
    document,
  );

  const port =
    Number(process.env.PORT) || 3001;

  await app.listen(port);

  console.log(
    `🚀 API: http://localhost:${port}/api`,
  );

  console.log(
    `📚 Swagger: http://localhost:${port}/docs`,
  );
}

bootstrap();
