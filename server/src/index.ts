import cors from 'cors';
import express from 'express';
import { env } from './env.js';
import { errorHandler } from './http.js';
import { authRouter } from './routes/auth.routes.js';
import { lotsRouter } from './routes/lots.routes.js';
import { partiesRouter } from './routes/parties.routes.js';
import { suppliersRouter } from './routes/suppliers.routes.js';
import { usersRouter } from './routes/users.routes.js';

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

/**
 * `ng serve` picks a free port when 4200 is taken, and its proxy forwards the
 * browser's Origin untouched — so in development any localhost port is allowed
 * rather than making the allowlist chase a moving port number. Production stays
 * strictly on CORS_ORIGINS.
 */
const isLocalhost = (origin: string): boolean =>
  /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin);

app.use(
  cors({
    origin: (origin, callback) => {
      // No Origin header: curl, health checks, same-origin requests.
      if (!origin) return callback(null, true);
      if (env.corsOrigins.includes(origin)) return callback(null, true);
      if (!env.isProd && isLocalhost(origin)) return callback(null, true);
      callback(new Error(`Origin not allowed: ${origin}`));
    },
    credentials: false,
  }),
);

// Pattern photos travel as inline JPEG data URLs, so the default 100kb limit
// is far too small — this ceiling sits just above Firestore's 1 MiB per document.
app.use(express.json({ limit: '8mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.use('/api/auth', authRouter);
app.use('/api/lots', lotsRouter);
app.use('/api/parties', partiesRouter);
app.use('/api/users', usersRouter);
app.use('/api/suppliers', suppliersRouter);

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Unknown endpoint' });
});

app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`[api] listening on http://localhost:${env.port}`);
});
