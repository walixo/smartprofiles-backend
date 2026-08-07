import { Router } from 'express';
import { authRouter } from './modules/auth/auth.routes.js';
import { chatRouter } from './modules/chat/chat.routes.js';
import { healthRouter } from './modules/health/health.routes.js';
import { profileRouter } from './modules/profiles/profile.routes.js';

/** Every feature router mounts here; `app.ts` mounts this once under `/api`. */
export const apiRouter: Router = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/profiles', profileRouter);
apiRouter.use('/chat', chatRouter);
