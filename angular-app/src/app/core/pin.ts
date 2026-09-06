/**
 * Lightweight PIN hashing for the closed-team login (username + PIN).
 * This is NOT strong security — a 4-digit PIN is trivially brute-forced and
 * the hashes live in a Firestore collection any signed-in client can read.
 * It exists so PINs aren't sitting in plain text and so the app knows *who*
 * is using it. Real security needs Firebase phone/email auth + a backend.
 */
export async function hashPin(pin: string): Promise<string> {
  const bytes = new TextEncoder().encode(`dp-creation:${pin}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
