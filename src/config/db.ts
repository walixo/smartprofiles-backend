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

export function getDatabaseStatus(): DatabaseStatus {
  return READY_STATES[mongoose.connection.readyState] ?? 'unknown';
}

export async function connectToDatabase(): Promise<void> {
  await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10_000,
    autoIndex: !isProduction,
  });

  mongoose.connection.on('error', (error: unknown) => {
    console.error('MongoDB connection error:', error);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected.');
  });
}

export async function disconnectFromDatabase(): Promise<void> {
  await mongoose.connection.close();
}
