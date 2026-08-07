import type { Role } from '../shared/vocabulary.js';

declare global {
  namespace Express {
    interface Request {
      /** Populated by the `authenticate` middleware; absent on public routes. */
      user?: {
        id: string;
        role: Role;
      };
    }
  }
}

export {};
