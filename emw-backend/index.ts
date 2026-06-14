import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import 'reflect-metadata';
import bodyParser from 'body-parser';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false });
  // 'health' queda fuera del prefijo 'api' para que el health-check de
  // contenedor/load-balancer pegue a GET /health (además de GET /api/health).
  app.setGlobalPrefix('api', { exclude: ['health'] });

  const cfg = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    optionsSuccessStatus: 204,
  });

  app.use(
    ['/webhook/whatsapp', '/api/webhook/whatsapp'],
    bodyParser.json({
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  app.use(bodyParser.json());

  const swaggerCfg = new DocumentBuilder()
    .setTitle('EMW Unified API')
    .setDescription('WhatsApp Business Marketing Platform - Unified API')
    .setVersion('2.0.0')
    .addBearerAuth()
    .build();
  const doc = SwaggerModule.createDocument(app, swaggerCfg);
  SwaggerModule.setup('api/docs', app, doc);

  const port = parseInt(cfg.get<string>('PORT') || '3001', 10);
  await app.listen(port);
  logger.log(`[CORS] origin => * (all origins allowed)`);
}

bootstrap().catch(err => {
  logger.error('Failed to start application:', err);
  process.exit(1);
});
