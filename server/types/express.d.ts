import type { users } from "@shared/models/auth";

type DbUser = typeof users.$inferSelect;

declare global {
  namespace Express {
    interface Request {
      dbUser?: DbUser;
    }

    interface User {
      id?: string;
      expires_at?: number;
      refresh_token?: string;
      access_token?: string;
      claims?: {
        sub: string;
        metadata?: {
          role?: string;
        };
      };
    }
  }
}

export {};
