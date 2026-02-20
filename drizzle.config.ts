import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: 'postgresql://postgres.cxwrhblzhheomprhhfir:s48457szEGZ631nZ@aws-1-ap-south-1.pooler.supabase.com:6543/postgres',
  },
});
