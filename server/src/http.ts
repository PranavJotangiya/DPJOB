import type { NextFunction, Request, Response } from 'express';
import { env } from './env.js';

/** Thrown anywhere in a route; turned into a JSON body by errorHandler. */
export class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

export const badRequest = (message: string) => new HttpError(400, message);
export const notFound = (message = 'Not found') => new HttpError(404, message);

/** Wraps an async handler so a rejected promise reaches errorHandler. */
export const wrap =
  <T extends Request>(handler: (req: T, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    handler(req as T, res).catch(next);
  };

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const status = err instanceof HttpError ? err.status : 500;
  const detail = err instanceof Error ? err.message : 'Server error';
  if (status >= 500) console.error('[api]', err);
  if (res.headersSent) return;
  // Unexpected failures say nothing useful to a client in production — the
  // detail (a Firebase or credentials error, say) belongs in the server log.
  // In development it goes to the caller too, where it saves a lot of guessing.
  const message = status >= 500 && env.isProd ? 'Server error' : detail;
  res.status(status).json({ error: message });
}

export const str = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

export const num = (value: unknown, fallback = 0): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

/**
 * Express 5 types a route param as `string | string[]`; every param this API
 * declares is a single segment, so narrow it once here.
 */
export const param = (req: Request, name: string): string => {
  const value = (req.params as Record<string, string | string[] | undefined>)[name];
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
};
