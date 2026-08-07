import express, { type Express } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { isProduction } from './config/env.js';
import { errorHandler } from './middleware/error-handler.js';
import { notFoundHandler } from './middleware/not-found-handler.js';
import { apiRouter } from './routes.js';
import { ApiError } from './utils/api-error.js';

export function createApp(): Express {
  const app = express();

  // Behind a single reverse proxy in production; keeps rate limiting keyed on
  // the real client IP rather than the proxy's.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  app.use(
    '/api',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      /*
       * Sized for the chat client's polling, which is the heaviest legitimate
       * traffic the app produces. A single user sitting on an open
       * conversation spends roughly 255 requests per window before touching
       * anything else (messages every 5s, threads every 20s, unread every
       * 30s). An earlier 300 limit locked such a user out mid-conversation.
       * This keeps ~4× headroom for normal browsing on top of that while
       * still stopping a scraper.
       */
      limit: isProduction ? 1200 : 6000,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      handler: (_req, _res, next) => {
        next(ApiError.tooManyRequests());
      },
    }),
  );

  app.use('/api', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
