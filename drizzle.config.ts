import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: 'postgresql://postgres.acmwjfxdczbdgdrezzub:4gocFcp1zdk8oI5K@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres',
  },
});
