import 'reflect-metadata';
import { existsSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { APP_CONFIG, type AppConfig } from './config/app-config.js';
import { setupApp } from './setup-app.js';

/**
 * For running without Docker: load the first .env found (backend/ or repo root).
 * Variables already set in the environment win. Docker Compose passes env directly.
 */
function loadLocalEnvFile(): void {
  const path = ['.env', '../.env'].find((candidate) => existsSync(candidate));
  if (path) process.loadEnvFile(path);
}

async function bootstrap(): Promise<void> {
  loadLocalEnvFile();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  setupApp(app);
  app.enableShutdownHooks();
  const { port } = app.get<AppConfig>(APP_CONFIG);
  await app.listen(port);
}

void bootstrap();
