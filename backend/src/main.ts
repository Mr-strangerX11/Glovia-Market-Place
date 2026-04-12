import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import compression = require('compression');
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Exception Filter for improved error handling and logging
  const { AllExceptionsFilter } = await import('./common/filters/http-exception.filter');
  app.useGlobalFilters(new AllExceptionsFilter());
  const configService = app.get(ConfigService);

  // Increase payload size limit for product images (50MB)
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ limit: '50mb', extended: true }));

  // Security
  app.use(helmet());
  const frontendUrls = (configService.get<string>('FRONTEND_URL') || '')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean);
  const fallbackOrigins = ['http://localhost:3000', 'http://localhost:3001'];
  const configuredOrigins = frontendUrls.length ? frontendUrls : fallbackOrigins;

  const normalizedAllowSet = new Set<string>();
  const normalizeOrigin = (origin: string) => {
    try {
      const parsed = new URL(origin);
      const hostWithoutWww = parsed.hostname.replace(/^www\./, '');
      return `${parsed.protocol}//${hostWithoutWww}${parsed.port ? `:${parsed.port}` : ''}`;
    } catch {
      return origin;
    }
  };

  configuredOrigins.forEach((origin) => {
    normalizedAllowSet.add(origin);
    normalizedAllowSet.add(normalizeOrigin(origin));

    try {
      const parsed = new URL(origin);
      const withWww = `${parsed.protocol}//www.${parsed.hostname.replace(/^www\./, '')}${parsed.port ? `:${parsed.port}` : ''}`;
      const withoutWww = `${parsed.protocol}//${parsed.hostname.replace(/^www\./, '')}${parsed.port ? `:${parsed.port}` : ''}`;
      normalizedAllowSet.add(withWww);
      normalizedAllowSet.add(withoutWww);
    } catch {
      // Ignore malformed URL values
    }
  });

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (normalizedAllowSet.has(origin) || normalizedAllowSet.has(normalizeOrigin(origin))) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} not allowed by CORS`), false);
    },
    credentials: true,
  });

  // Compression
  app.use(compression());

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // API Prefix
  const apiPrefix = configService.get('API_PREFIX') || 'api/v1';
  app.setGlobalPrefix(apiPrefix);

  // Swagger Documentation
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Glovia Market place API')
      .setDescription('E-Commerce Platform API Documentation')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('Auth', 'Authentication endpoints')
      .addTag('Users', 'User management')
      .addTag('Products', 'Product catalog')
      .addTag('Categories', 'Product categories')
      .addTag('Orders', 'Order management')
      .addTag('Payments', 'Payment processing')
      .addTag('Admin', 'Admin operations')
      .build();
    
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = configService.get('PORT') || 3001;
  await app.listen(port, '0.0.0.0');
  
  console.log(`🚀 Glovia Market place API is running on: http://0.0.0.0:${port}/${apiPrefix}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
  }
}

bootstrap();
