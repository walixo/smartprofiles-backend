import { Router } from 'express';
import { validateBody } from '../../middleware/validate-body.js';
import { create, listOwn, remove, reorder, update } from './work.controller.js';
import { createWorkSchema, reorderWorksSchema, updateWorkSchema } from './work.schema.js';

/**
 * Mounted under `/profiles/me/works`, which already applies `authenticate` and
 * `authorize('freelancer')`. Ownership itself is enforced in the service, which
 * scopes every lookup to the caller's own profile.
 */
export const workRouter: Router = Router();

workRouter.get('/', listOwn);
workRouter.post('/', validateBody(createWorkSchema), create);
// Declared before `/:workId` so "reorder" is never read as an id.
workRouter.patch('/reorder', validateBody(reorderWorksSchema), reorder);
workRouter.patch('/:workId', validateBody(updateWorkSchema), update);
workRouter.delete('/:workId', remove);
