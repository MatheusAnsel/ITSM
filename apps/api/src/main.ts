import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { validateEnv } from './config/env';

async function bootstrap(): Promise<void> {
  // Falha cedo: a API não sobe com configuração incompleta.
  const env = validateEnv();

  const app = await NestFactory.create(AppModule);
  configureApp(app, env);
  // Encerra com limpeza (conexões do banco, jobs) ao receber SIGTERM do Docker/orquestrador.
  app.enableShutdownHooks();

  await app.listen(env.PORT);
  new Logger('Bootstrap').log(`API em http://localhost:${env.PORT}/api`);
}

void bootstrap();
