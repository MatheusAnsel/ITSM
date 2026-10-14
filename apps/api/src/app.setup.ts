import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/http-exception.filter';
import { requestIdMiddleware } from './common/request-id.middleware';
import type { Env } from './config/env';

// Configuração compartilhada entre a API real (main.ts) e os testes e2e, para que os testes
// exercitem exatamente o mesmo prefixo, cabeçalhos de segurança, validação e formato de erro.
export function configureApp(app: INestApplication, env: Env): void {
  app.setGlobalPrefix('api');
  app.use(requestIdMiddleware);
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({ origin: env.CORS_ORIGINS, credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());

  if (env.SWAGGER_ENABLED) {
    const config = new DocumentBuilder()
      .setTitle('ITSM API')
      .setDescription('Gestão de chamados e ativos de TI')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));
  }
}
