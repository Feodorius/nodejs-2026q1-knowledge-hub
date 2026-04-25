import 'dotenv/config';
import { NestFactory, Reflector } from '@nestjs/core';
import {
  ClassSerializerInterceptor,
  ValidationPipe,
  Logger,
  INestApplication,
} from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AppLogger } from './common/logger/app.logger';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

const appLogger = new AppLogger();
Logger.overrideLogger(appLogger);

let app: INestApplication;

async function gracefulShutdown(): Promise<void> {
  if (app) {
    await app.close();
  }
  process.exit(1);
}

process.on('uncaughtException', (error: Error) => {
  appLogger.error(
    `Uncaught Exception: ${error.message}`,
    error.stack,
    'Process',
  );
  gracefulShutdown().catch(() => process.exit(1));
});

process.on('unhandledRejection', (reason: unknown) => {
  const message = reason instanceof Error ? reason.message : String(reason);
  const stack = reason instanceof Error ? reason.stack : undefined;
  appLogger.error(`Unhandled Rejection: ${message}`, stack, 'Process');
  gracefulShutdown().catch(() => process.exit(1));
});

async function bootstrap() {
  app = await NestFactory.create(AppModule, { logger: appLogger });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.useGlobalFilters(new AllExceptionsFilter());

  const config = new DocumentBuilder()
    .setTitle('Knowledge Hub API')
    .setDescription('REST API for Knowledge Hub platform')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('doc', app, document);

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
}

bootstrap();
