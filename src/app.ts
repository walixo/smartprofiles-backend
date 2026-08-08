import express, {
  type Express,
  type NextFunction,
  type Request,
  type RequestHandler,
  type Response,
} from 'express';
import { rateLimit } from 'express-rate-limit';
import helmetModule, { type HelmetOptions } from 'helmet';
import { connectToDatabase } from './config/db.js';
import { isProduction } from './config/env.js';
import { cors } from './middleware/cors.js';
import { errorHandler } from './middleware/error-handler.js';
import { notFoundHandler } from './middleware/not-found-handler.js';
import { apiRouter } from './routes.js';
import { ApiError } from './utils/api-error.js';

// Some deployment toolchains expose CommonJS packages as a module namespace
// even when their typings advertise a default export. Normalizing the export
// here keeps Helmet callable in both NodeNext and Vercel's build environment.
type HelmetFactory = (options?: HelmetOptions) => RequestHandler;
const helmetImport = helmetModule as unknown as {
  default?: HelmetFactory;
};
const helmet = helmetImport.default ?? (helmetModule as unknown as HelmetFactory);

export function createApp(): Express {
  const app = express();

  // Behind a single reverse proxy in production; keeps rate limiting keyed on
  // the real client IP rather than the proxy's.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet());

  // Before the body parser and the limiter: a preflight carries no body, and
  // charging it against the rate limit would let a chatty browser exhaust a
  // user's quota with requests they never made.
  app.use('/api', cors);

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
      handler: (_req: Request, _res: Response, next: NextFunction) => {
        next(ApiError.tooManyRequests());
      },
    }),
  );

  app.use('/api', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

const serverlessApp = createApp();

/**
 * Vercel executes this module as a serverless function and requires its
 * default export to be a request handler. The database connection is opened
 * lazily and reused by warm function instances.
 */
export default async function handler(req: Request, res: Response): Promise<void> {
  try {
    await connectToDatabase();
    serverlessApp(req, res);
  } catch (error: unknown) {
    console.error('Failed to connect to MongoDB:', error);
    res.status(503).json({
      success: false,
      message: 'Service temporarily unavailable.',
    });
  }
}
