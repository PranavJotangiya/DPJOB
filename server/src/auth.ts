import type { NextFunction, Request, Response } from 'express';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from './env.js';
import { HttpError } from './http.js';
import type { SessionUser } from './types.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}

export function issueToken(user: SessionUser): string {
  return jwt.sign(user, env.sessionSecret, {
    expiresIn: env.sessionTtl,
  } as SignOptions);
}

function verify(token: string): SessionUser | null {
  try {
    const payload = jwt.verify(token, env.sessionSecret) as Partial<SessionUser>;
    if (!payload?.username || !payload.role) return null;
    return { username: payload.username, name: payload.name ?? payload.username, role: payload.role };
  } catch {
    return null;
  }
}

/**
 * Reads the bearer token, or a `token` query param — EventSource (used by the
 * live-update streams) cannot set request headers.
 */
function tokenFrom(req: Request): string {
  const header = req.header('authorization') ?? '';
  if (header.toLowerCase().startsWith('bearer ')) return header.slice(7).trim();
  const q = req.query['token'];
  return typeof q === 'string' ? q : '';
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const user = verify(tokenFrom(req));
  if (!user) {
    next(new HttpError(401, 'Sign in required'));
    return;
  }
  req.user = user;
  next();
}

/**
 * There is no role-based access control: every signed-in user can do
 * everything, including managing users. `role` is kept on the user record as a
 * label the Users page shows, but it grants and withholds nothing — which is
 * also how this app behaved before the API existed, when the Firestore rules
 * let any signed-in client read and write every collection.
 */
