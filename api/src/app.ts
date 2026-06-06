import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { getRateLimitConfig } from './core/config/rate-limit.js';
import { errorHandler } from './core/errors/error-handler.js';
import { globalRateLimiter } from './middleware/rate-limit.js';
import authRoutes from './modules/auth/auth.routes.js';
import usersRoutes from './modules/users/users.routes.js';
import templatesRoutes from './modules/templates/templates.routes.js';
import contractsRoutes from './modules/contracts/contracts.routes.js';
import signaturesRoutes from './modules/signatures/signatures.routes.js';
import obrasRoutes from './modules/obras/obras.routes.js';
import purchaseOrdersRoutes from './modules/purchase-orders/purchase-orders.routes.js';
import uploadsRoutes from './modules/uploads/uploads.routes.js';
import reportsRoutes from './modules/reports/reports.routes.js';
import legalRoutes from './modules/legal/legal.routes.js';
import privacyRoutes from './modules/privacy/privacy.routes.js';
import workflowRoutes from './modules/workflow/workflow.routes.js';
import purchaseRequestsRoutes from './modules/purchase-requests/purchase-requests.routes.js';

export function createApp() {
  const app = express();
  const rateLimitConfig = getRateLimitConfig();

  if (rateLimitConfig.trustProxy) {
    app.set('trust proxy', 1);
  }

  const configuredOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (configuredOrigins.includes(origin)) return callback(null, true);
        if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return callback(null, true);
        callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
    }),
  );
  app.use(cookieParser());
  app.use(express.json({ limit: '10mb' }));
  app.use(globalRateLimiter);

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'fortify-api' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/legal', legalRoutes);
  app.use('/api/privacy', privacyRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/templates', templatesRoutes);
  app.use('/api/contracts', contractsRoutes);
  app.use('/api/signatures', signaturesRoutes);
  app.use('/api/obras', obrasRoutes);
  app.use('/api/purchase-orders', purchaseOrdersRoutes);
  app.use('/api/uploads', uploadsRoutes);
  app.use('/api/workflow', workflowRoutes);
  app.use('/api/purchase-requests', purchaseRequestsRoutes);
  app.use('/api', reportsRoutes);

  app.use(errorHandler);

  return app;
}
