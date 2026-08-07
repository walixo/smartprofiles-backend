import { Router } from 'express';
import { authenticate, optionalAuthenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validateBody } from '../../middleware/validate-body.js';
import { workRouter } from '../works/work.routes.js';
import { browse, checkHandle, create, readByHandle, readOwn, setVisibility, updateOwn } from './profile.controller.js';
import { createProfileSchema, setVisibilitySchema, updateProfileSchema } from './profile.schema.js';

export const profileRouter: Router = Router();

/* ---- Owner routes. Declared before `/:handle` so they are not swallowed by it. ---- */

profileRouter.get('/handle-available', authenticate, checkHandle);

profileRouter.post('/', authenticate, authorize('freelancer'), validateBody(createProfileSchema), create);
profileRouter.get('/me', authenticate, authorize('freelancer'), readOwn);
profileRouter.patch('/me', authenticate, authorize('freelancer'), validateBody(updateProfileSchema), updateOwn);
profileRouter.patch(
  '/me/visibility',
  authenticate,
  authorize('freelancer'),
  validateBody(setVisibilitySchema),
  setVisibility,
);

// Portfolio items live under the caller's own profile.
profileRouter.use('/me/works', authenticate, authorize('freelancer'), workRouter);

/* ---- Public routes ---- */

profileRouter.get('/', browse);
// Optional auth: signing in is what releases the phone number.
profileRouter.get('/:handle', optionalAuthenticate, readByHandle);
