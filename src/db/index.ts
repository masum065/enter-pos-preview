import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres.cxwrhblzhheomprhhfir:s48457szEGZ631nZ@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

// Disable prefetch as it is not supported for "Transaction" pool mode
const client = postgres(connectionString, { prepare: false });
export const db = drizzle(client, { schema });

// Re-export schema for convenience
export * from './schema';
