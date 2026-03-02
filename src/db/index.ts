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

const globalForPostgres = globalThis as unknown as {
  postgresClient: postgres.Sql | undefined;
};

/**
 * Supabase Transaction Pooler (port 6543) config:
 * - prepare: false — required for pgBouncer transaction mode
 * - max: 15        — increased so parallel queries don't block each other
 * - idle_timeout: 20 — release idle connections quickly
 * - connect_timeout: 10 — fail fast on network issues
 */
const client = globalForPostgres.postgresClient ?? postgres(connectionString!, {
  prepare: false,
  max: 15,
  idle_timeout: 20,
  connect_timeout: 10,
});

if (process.env.NODE_ENV !== 'production') {
  globalForPostgres.postgresClient = client;
}

export const db = drizzle(client, { schema });

// Re-export schema for convenience
export * from './schema';
