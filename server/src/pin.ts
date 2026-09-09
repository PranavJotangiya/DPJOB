import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Same scheme the browser used before this server existed (SHA-256 over
 * `dp-creation:<pin>`), kept byte-for-byte so every PIN already in the `users`
 * collection still works. The difference now is where it runs: PIN hashes never
 * leave the server, and clients can no longer read the collection at all.
 */
export function hashPin(pin: string): string {
  return createHash('sha256').update(`dp-creation:${pin}`).digest('hex');
}

export function pinMatches(pin: string, storedHash: unknown): boolean {
  if (typeof storedHash !== 'string' || storedHash.length === 0) return false;
  const a = Buffer.from(hashPin(pin), 'utf8');
  const b = Buffer.from(storedHash, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}
