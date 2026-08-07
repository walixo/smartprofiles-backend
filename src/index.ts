import type { Server } from 'node:http';
import { createApp } from './app.js';
import { connectToDatabase, disconnectFromDatabase } from './config/db.js';
import { env } from './config/env.js';

async function bootstrap(): Promise<void> {
  await connectToDatabase();

  const app = createApp();
  const server: Server = app.listen(env.PORT, () => {
    console.log(`Smart Profiles API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });

  registerShutdownHandlers(server);
}

function registerShutdownHandlers(server: Server): void {
  let shuttingDown = false;

  const shutdown = (signal: string): void => {
    if (shuttingDown) return;
    shuttingDown = true;

    console.log(`\n${signal} received — shutting down.`);

    server.close(() => {
      void disconnectFromDatabase()
        .then(() => process.exit(0))
        .catch((error: unknown) => {
          console.error('Error while closing the database connection:', error);
          process.exit(1);
        });
    });

    // Do not let a hung connection keep the process alive indefinitely.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((error: unknown) => {
  console.error('Failed to start the server:', error);
  process.exit(1);
});
