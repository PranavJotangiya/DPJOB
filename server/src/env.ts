import 'dotenv/config';

const list = (value: string | undefined, fallback: string[]): string[] => {
  const parts = (value ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  return parts.length > 0 ? parts : fallback;
};

export const env = {
  port: Number(process.env['PORT'] ?? 8080),
  corsOrigins: list(process.env['CORS_ORIGINS'], [
    'http://localhost:4200',
    'http://localhost:8080',
  ]),
  sessionSecret: process.env['SESSION_SECRET'] ?? 'dp-creation-dev-secret',
  sessionTtl: process.env['SESSION_TTL'] ?? '30d',
  projectId: process.env['FIREBASE_PROJECT_ID'] ?? '',
  serviceAccountJson: process.env['FIREBASE_SERVICE_ACCOUNT'] ?? '',
  isProd: process.env['NODE_ENV'] === 'production',
};

if (env.isProd && env.sessionSecret === 'dp-creation-dev-secret') {
  throw new Error('SESSION_SECRET must be set in production');
}
