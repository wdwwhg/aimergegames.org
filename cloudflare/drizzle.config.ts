import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/config/db/schema.sqlite.ts',
  out: './cloudflare/migrations',
  dialect: 'sqlite',
});
