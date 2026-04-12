const path = require('path');
const express = require('express');
const { NestFactory } = require('@nestjs/core');
const { ExpressAdapter } = require('@nestjs/platform-express');
const { ValidationPipe } = require('@nestjs/common');
const { SwaggerModule, DocumentBuilder } = require('@nestjs/swagger');
const { ConfigService } = require('@nestjs/config');
const helmet = require('helmet');
const compression = require('compression');

// Try loading from dist first, fallback to src for development
let AppModule;
try {
  AppModule = require(path.join(__dirname, '../dist/app.module')).AppModule;
} catch (err) {
  console.error('Failed to load compiled module from dist:', err.message);
  console.error('Trying alternative path...');
  try {
    AppModule = require(path.join(__dirname, '../src/app.module')).AppModule;
  } catch (err2) {
    console.error('Both module loads failed. Build may not have completed.');
    throw new Error(`Cannot find AppModule. ${err.message}`);
  }
}

let cachedHandler = null;

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

const DEFAULT_FRONTEND_URLS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://glovia.com.np',
  'https://www.glovia.com.np',
];

function normalizeOrigin(origin) {
  try {
    const parsed = new URL(origin);
    const hostname = parsed.hostname.replace(/^www\./, '');
    return `${parsed.protocol}//${hostname}${parsed.port ? `:${parsed.port}` : ''}`;
  } catch {
    return origin;
  }
}

function expandOrigins(origins) {
  const expanded = new Set();

  for (const origin of origins) {
    expanded.add(origin);
    expanded.add(normalizeOrigin(origin));

    try {
      const parsed = new URL(origin);
      const baseHost = parsed.hostname.replace(/^www\./, '');
      expanded.add(`${parsed.protocol}//${baseHost}${parsed.port ? `:${parsed.port}` : ''}`);
      expanded.add(`${parsed.protocol}//www.${baseHost}${parsed.port ? `:${parsed.port}` : ''}`);
    } catch {
      // Ignore malformed origins
    }
  }

  return Array.from(expanded);
}

function getAllowedOriginsFromEnv(frontendUrlValue) {
  const fromEnv = (frontendUrlValue || '')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean);
  const baseOrigins = fromEnv.length > 0 ? fromEnv : DEFAULT_FRONTEND_URLS;
  return expandOrigins(baseOrigins);
}

async function createHandler() {
  const expressApp = express();
  let allowedOrigins = getAllowedOriginsFromEnv(process.env.FRONTEND_URL);
  
  // Set CORS headers immediately for all requests
  expressApp.use((req, res, next) => {
    const origin = req.headers.origin;
    const isAllowed = origin && (allowedOrigins.includes(origin) || allowedOrigins.includes(normalizeOrigin(origin)));

    if (isAllowed) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else if (!origin) {
      // Allow requests without origin (for health checks, etc)
      res.setHeader('Access-Control-Allow-Origin', '*');
    } else {
      res.setHeader('Access-Control-Allow-Origin', allowedOrigins[0] || 'https://glovia.com.np');
    }
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('X-Powered-By', 'Glovia-Backend');
    
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    next();
  });
  
  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp));
  const configService = app.get(ConfigService);

  const frontendUrls = (configService.get('FRONTEND_URL') || '')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean);
  allowedOrigins = getAllowedOriginsFromEnv(frontendUrls.join(','));

  // Configure CORS in NestJS (backup for routes after global prefix)
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      const isGloviaDomain = /^https:\/\/(www\.)?glovia\.com\.np$/i.test(origin);
      if (isGloviaDomain || allowedOrigins.includes(origin) || allowedOrigins.includes(normalizeOrigin(origin))) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin ${origin} not allowed by CORS`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // Configure helmet to not interfere with CORS
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false,
  }));

  app.use(compression());

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

  const apiPrefix = configService.get('API_PREFIX') || 'api/v1';
  app.setGlobalPrefix(apiPrefix);

  // Root health endpoint (before global prefix)
  expressApp.get('/', (req, res) => {
    res.json({
      status: 'ok',
      message: 'Glovia Market place Backend API',
      version: '1.0.0',
      endpoints: {
        api: `/${apiPrefix}`,
        docs: process.env.NODE_ENV !== 'production' ? '/api/docs' : 'disabled',
      },
    });
  });

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

  await app.init();
  // Express app is a valid (req, res) handler - no serverless-http needed on Vercel
  return expressApp;
}

function getAllowedOrigins() {
  return getAllowedOriginsFromEnv(process.env.FRONTEND_URL);
}

function addCorsHeaders(res, origin) {
  const allowedOrigins = getAllowedOrigins();
  const isGloviaDomain =
    typeof origin === 'string' && /^https:\/\/(www\.)?glovia\.com\.np$/i.test(origin);
  const isAllowed = origin && (isGloviaDomain || allowedOrigins.includes(origin) || allowedOrigins.includes(normalizeOrigin(origin)));
  const allowOrigin =
    isAllowed
      ? origin
      : allowedOrigins[0] || 'https://glovia.com.np';

  res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
}

module.exports = async (req, res) => {
  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    addCorsHeaders(res, req.headers.origin);
    return res.status(200).end();
  }

  try {
    if (!cachedHandler) {
      cachedHandler = await createHandler();
    }
    return cachedHandler(req, res);
  } catch (error) {
    console.error('Function invocation failed:', error);
    addCorsHeaders(res, req.headers.origin);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
    });
  }
};
