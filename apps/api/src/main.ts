import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/http-exception.filter';
import { requestIdMiddleware } from './common/request-id.middleware';
import { validateEnv } from './config/env';

async function bootstrap(): Promise<void> {
  // Falha cedo: a API não sobe com configuração incompleta.
  const env = validateEnv();

  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.use(requestIdMiddleware);
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({ origin: env.CORS_ORIGINS, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
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

  await app.listen(env.PORT);
  new Logger('Bootstrap').log(`API em http://localhost:${env.PORT}/api`);
}

void bootstrap();
