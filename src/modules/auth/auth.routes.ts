import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import { rateLimit } from 'express-rate-limit';
import { isProduction } from '../../config/env.js';
import { authenticate } from '../../middleware/authenticate.js';
import { validateBody } from '../../middleware/validate-body.js';
import { ApiError } from '../../utils/api-error.js';
import { login, me, register } from './auth.controller.js';
import { loginSchema, registerSchema } from './auth.schema.js';

/**
 * Far tighter than the global API limit: these are the endpoints worth
 * brute-forcing. Keyed on IP, and counts only failures so a legitimate user
 * signing in repeatedly is never locked out.
 */
const credentialsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isProduction ? 10 : 100,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req: Request, _res: Response, next: NextFunction) => {
    next(ApiError.tooManyRequests('Too many attempts. Please wait a few minutes and try again.'));
  },
});

export const authRouter: Router = Router();

authRouter.post('/register', credentialsLimiter, validateBody(registerSchema), register);
authRouter.post('/login', credentialsLimiter, validateBody(loginSchema), login);
authRouter.get('/me', authenticate, me);
