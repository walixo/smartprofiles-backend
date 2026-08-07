import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { validateBody } from '../../middleware/validate-body.js';
import { listOwnThreads, markRead, messages, post, start, unreadTotal } from './chat.controller.js';
import { sendMessageSchema, startThreadSchema } from './chat.schema.js';

/** Every route requires a session; membership is enforced per thread in the service. */
export const chatRouter: Router = Router();

chatRouter.use(authenticate);

chatRouter.get('/threads', listOwnThreads);
// Declared before `/threads/:threadId/...` so "unread" is never read as an id.
chatRouter.get('/unread', unreadTotal);
chatRouter.post('/threads', validateBody(startThreadSchema), start);
chatRouter.get('/threads/:threadId/messages', messages);
chatRouter.post('/threads/:threadId/messages', validateBody(sendMessageSchema), post);
chatRouter.post('/threads/:threadId/read', markRead);
