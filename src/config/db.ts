import mongoose from 'mongoose';
import { env, isProduction } from './env.js';

mongoose.set('strictQuery', true);

if (!isProduction) {
  mongoose.set('debug', false);
}

/**
 * Connection state exposed to the health endpoint, mapped from the numeric
 * `readyState` Mongoose reports.
 */
export type DatabaseStatus = 'disconnected' | 'connected' | 'connecting' | 'disconnecting' | 'unknown';

const READY_STATES: Record<number, DatabaseStatus> = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

let connectionPromise: Promise<void> | undefined;

mongoose.connection.on('error', (error: unknown) => {
  console.error('MongoDB connection error:', error);
});

mongoose.connection.on('disconnected', () => {
  connectionPromise = undefined;
  console.warn('MongoDB disconnected.');
});

export function getDatabaseStatus(): DatabaseStatus {
  return READY_STATES[mongoose.connection.readyState] ?? 'unknown';
}

export async function connectToDatabase(): Promise<void> {
  if (mongoose.connection.readyState === 1) return;

  connectionPromise ??= mongoose
    .connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10_000,
      autoIndex: !isProduction,
    })
    .then(() => undefined)
    .catch((error: unknown) => {
      // Allow a later request (or local restart logic) to retry after a
      // transient connection failure.
      connectionPromise = undefined;
      throw error;
    });

  await connectionPromise;
}

export async function disconnectFromDatabase(): Promise<void> {
  await mongoose.connection.close();
  connectionPromise = undefined;
}
