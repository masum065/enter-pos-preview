import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

/**
 * Supabase Transaction Pooler (port 6543) config:
 * - prepare: false — required for pgBouncer transaction mode
 * - max: 3 — match Supabase free tier connection limit (avoid exhaustion)
 * - idle_timeout: 20 — release idle connections quickly
 * - connect_timeout: 10 — fail fast on network issues
 */
const client = postgres(connectionString, {
  prepare: false,
  max: 3,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });

// Re-export schema for convenience
export * from './schema';
