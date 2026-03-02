import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  // In production this is fatal; in dev it may mean .env.local isn't loaded yet
  console.error(
    '[DB] DATABASE_URL is not set. Check your .env.local file.'
  );
}

/**
 * Supabase Transaction Pooler (port 6543) config:
 * - prepare: false — required for pgBouncer transaction mode
 * - max: 5       — small pool, avoids exhausting Supabase free tier (25 limit)
 * - idle_timeout: 20 — release idle connections quickly
 * - connect_timeout: 10 — fail fast on network issues
 */
const client = postgres(connectionString!, {
  prepare: false,
  max: 5,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });

// Re-export schema for convenience
export * from './schema';
