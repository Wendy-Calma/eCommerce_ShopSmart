import crypto from 'node:crypto';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import productsRouter from './routes/products.js';
import ordersRouter from './routes/orders.js';
import assistantRouter from './routes/assistant.js';

const BODY_ERRORS = {
  'entity.parse.failed': { code: 'INVALID_JSON', message: 'Request body must be valid JSON.' },
  'entity.too.large': { code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large.' }
};

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
  app.use((request, response, next) => { request.id = crypto.randomUUID(); response.setHeader('X-Request-ID', request.id); next(); });
  app.use(express.json({ limit: '100kb' }));
  app.use(morgan(':method :url :status :response-time ms'));

  app.get('/api/health', (_request, response) => response.json({ status: 'ok' }));
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
