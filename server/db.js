import path from 'path'
import { fileURLToPath } from 'url'

// Local fallback DB path — only used when TURSO_DATABASE_URL is not set (i.e.
// never on Netlify). Guarded so a CJS-bundled context without import.meta works.
let localDbUrl = 'file:local.db'
try {
  localDbUrl = `file:${path.join(path.dirname(fileURLToPath(import.meta.url)), 'local.db')}`
} catch {
  /* import.meta unavailable — keep the relative fallback */
}

const url = process.env.TURSO_DATABASE_URL || localDbUrl
const authToken = process.env.TURSO_AUTH_TOKEN
// Remote Turso URL -> use the pure-JS ("web") client (no native addon, works in
// serverless). Local file:/ URL -> use the Node client which supports files.
const isRemote = /^(libsql|wss?|https?):/i.test(url)

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    contact TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS lots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lot_number TEXT NOT NULL UNIQUE,
    lot_date TEXT,
    supplier TEXT,
    short_number TEXT,
    short_name TEXT,
    program_date TEXT,
    cutting_date TEXT,
    fabric_type TEXT,
    color TEXT,
    description TEXT,
    pana INTEGER,
    total_meters REAL,
    average_consumption REAL,
    total_pieces INTEGER,
    status TEXT DEFAULT 'Draft',
    notes TEXT,
    created_by TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS lot_sizes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lot_id INTEGER NOT NULL,
    size INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    FOREIGN KEY(lot_id) REFERENCES lots(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS bales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lot_id INTEGER NOT NULL,
    bale_number TEXT,
    meters REAL,
    weight REAL,
    shade TEXT,
    remarks TEXT,
    FOREIGN KEY(lot_id) REFERENCES lots(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS patterns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lot_id INTEGER NOT NULL,
    pattern_type TEXT,
    marker_length REAL,
    marker_width REAL,
    lay_length REAL,
    no_of_layers INTEGER,
    no_of_plies INTEGER,
    image_url TEXT,
    FOREIGN KEY(lot_id) REFERENCES lots(id) ON DELETE CASCADE
  );
`

const SUPPLIER_SEED = ['MTLNY', 'JAYDEEP', 'SUGAM', 'RUDRA', 'AMMEF', 'KAPIL', 'MGB', 'VISHAL']

let client
let readyPromise

const isServerless = Boolean(
  process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT,
)

async function init() {
  if (!isRemote && isServerless) {
    throw new Error(
      'Database not configured. Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in your ' +
      'Netlify environment variables (Site configuration → Environment variables), then redeploy.',
    )
  }

  const { createClient } = isRemote
    ? await import('@libsql/client/web')
    : await import('@libsql/client')

  client = createClient(authToken ? { url, authToken } : { url })

  await client.executeMultiple(SCHEMA)
  // Add columns introduced after the first release (no-op if they already exist).
  for (const alter of ['ALTER TABLE lots ADD COLUMN short_name TEXT']) {
    try { await client.execute(alter) } catch { /* column already present */ }
  }
  const { rows } = await client.execute('SELECT COUNT(*) AS count FROM suppliers')
  if (Number(rows[0].count) === 0) {
    await client.batch(
      SUPPLIER_SEED.map((name) => ({ sql: 'INSERT INTO suppliers (name) VALUES (?)', args: [name] })),
      'write',
    )
  }
}

// Idempotent; safe to await on every request (runs once per process).
export function ready() {
  if (!readyPromise) readyPromise = init()
  return readyPromise
}

export function getDb() {
  if (!client) throw new Error('Database not initialised — call ready() first.')
  return client
}
