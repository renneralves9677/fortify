import express from 'express';
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { ipKeyGenerator } from 'express-rate-limit';
import { createRateLimiter } from './rate-limit.js';

function buildTestApp(limiter: ReturnType<typeof createRateLimiter>) {
  const app = express();
  app.use(express.json());
  app.post('/login', limiter, (_req, res) => {
    res.status(400).json({ error: 'Dados inválidos', code: 'VALIDATION' });
  });
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  return app;
}

describe('rate-limit middleware', () => {
  it('returns 429 with RATE_LIMITED after max requests', async () => {
    const limiter = createRateLimiter({ max: 2, windowMs: 60_000, ignoreVitest: true });
    const app = buildTestApp(limiter);

    const first = await request(app).post('/login').send({});
    const second = await request(app).post('/login').send({});
    const third = await request(app).post('/login').send({});

    expect(first.status).toBe(400);
    expect(second.status).toBe(400);
    expect(third.status).toBe(429);
    expect(third.body).toEqual({
      error: 'Muitas requisições. Tente novamente em alguns minutos.',
      code: 'RATE_LIMITED',
    });
  });

  it('skips health checks when configured on global limiter', async () => {
    const limiter = createRateLimiter({
      max: 1,
      windowMs: 60_000,
      ignoreVitest: true,
      skip: (req) => req.path === '/health',
    });
    const app = buildTestApp(limiter);

    const first = await request(app).get('/health');
    const second = await request(app).get('/health');

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
  });

  it('scopes signature OTP limiter by token', async () => {
    const limiter = createRateLimiter({
      max: 1,
      windowMs: 60_000,
      ignoreVitest: true,
      keyGenerator: (req) => `${ipKeyGenerator(req.ip ?? '')}:${req.params.token ?? ''}`,
    });
    const app = express();
    app.use(express.json());
    app.post('/public/:token/otp/send', limiter, (_req, res) => {
      res.status(400).json({ error: 'Dados inválidos', code: 'VALIDATION' });
    });

    const tokenA = await request(app).post('/public/aaa/otp/send').send({});
    const tokenB = await request(app).post('/public/bbb/otp/send').send({});
    const tokenAAgain = await request(app).post('/public/aaa/otp/send').send({});

    expect(tokenA.status).toBe(400);
    expect(tokenB.status).toBe(400);
    expect(tokenAAgain.status).toBe(429);
  });
});
