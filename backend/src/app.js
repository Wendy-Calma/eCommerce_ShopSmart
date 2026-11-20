import crypto from 'node:crypto';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import productsRouter from './routes/products.js';
import ordersRouter from './routes/orders.js';
import assistantRouter from './routes/assistant.js';
import authRouter from './routes/auth.js';
import { prisma } from './lib/prisma.js';

const BODY_ERRORS = {
  'entity.parse.failed': { code: 'INVALID_JSON', message: 'Request body must be valid JSON.' },
  'entity.too.large': { code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large.' }
};

export function trustProxySetting(value) {
  const hops = Number(value);
  return Number.isInteger(hops) && hops > 0 ? hops : false;
}

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', trustProxySetting(process.env.TRUST_PROXY));
  app.use(helmet());
  app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
  app.use((request, response, next) => { request.id = crypto.randomUUID(); response.setHeader('X-Request-ID', request.id); next(); });
  app.use(express.json({ limit: '100kb' }));
  app.use(morgan(':method :url :status :response-time ms'));

  app.get('/api/health', (_request, response) => response.json({ status: 'ok' }));
  app.get('/api/health/ready', async (_request, response) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      response.json({ status: 'ok', database: 'ok' });
    } catch {
      response.status(503).json({ status: 'error', database: 'unreachable' });
    }
  });
  app.use('/api/auth', authRouter);
  app.use('/api/products', productsRouter);
  app.use('/api/orders', ordersRouter);
  app.use('/api/assistant', assistantRouter);
  app.use((_request, response) => response.status(404).json({ error: { code: 'ROUTE_NOT_FOUND', message: 'API route could not be found.' } }));
  app.use((error, request, response, _next) => {
    console.error(`[${request.id}]`, error);
    const bodyError = BODY_ERRORS[error.type];
    if (bodyError) return response.status(error.status).json({ error: { ...bodyError, traceId: request.id } });
    response.status(error.status || 500).json({ error: { code: error.code || 'INTERNAL_ERROR', message: error.status ? error.message : 'The server could not complete the request.', traceId: request.id } });
  });
  return app;
}
