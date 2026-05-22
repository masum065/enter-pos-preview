import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: 'postgresql://postgres:4gocFcp1zdk8oI5K@db.acmwjfxdczbdgdrezzub.supabase.co:5432/postgres',
  },
});
