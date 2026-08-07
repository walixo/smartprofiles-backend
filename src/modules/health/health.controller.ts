import type { Request, Response } from 'express';
import { getDatabaseStatus, type DatabaseStatus } from '../../config/db.js';
import { env } from '../../config/env.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { sendSuccess } from '../../utils/envelope.js';

interface HealthPayload {
  status: 'ok' | 'degraded';
  environment: string;
  database: DatabaseStatus;
  uptimeSeconds: number;
  timestamp: string;
}

/**
 * Liveness + readiness in one call. Returns 503 when the database is not
 * connected so a process manager can act on it rather than parsing the body.
 */
export const getHealth = asyncHandler((_req: Request, res: Response) => {
  const database = getDatabaseStatus();
  const isHealthy = database === 'connected';

  const payload: HealthPayload = {
    status: isHealthy ? 'ok' : 'degraded',
    environment: env.NODE_ENV,
    database,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  };

  sendSuccess(res, payload, isHealthy ? 200 : 503);
});
