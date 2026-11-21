import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';

/**
 * App-wide HTTP setup, shared by main.ts and the e2e tests so tests run
 * the same prefix and validation rules as production.
 */
export function setupApp(app: NestExpressApplication): void {
  app.setGlobalPrefix('api');
  app.disable('x-powered-by');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
}
