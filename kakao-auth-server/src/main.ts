import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.setGlobalPrefix('api');

  const config = app.get(ConfigService);
  const port = parseInt(config.get<string>('PORT', '3001'), 10);
  await app.listen(port);
  Logger.log(`🚀 Kakao auth server running on http://localhost:${port}/api`, 'Bootstrap');
}
bootstrap();
