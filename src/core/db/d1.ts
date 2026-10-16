import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';

// Minimal D1Database type to avoid pulling in @cloudflare/workers-types globally
type D1Database = {
  prepare(query: string): any;
  batch(statements: any[]): Promise<any[]>;
  exec(query: string): Promise<any>;
  dump(): Promise<ArrayBuffer>;
};

export function getD1Binding(): D1Database {
  const { env } = getCloudflareContext();
  const binding = (env as unknown as { DB?: D1Database }).DB;
  if (!binding) throw new Error('Cloudflare D1 binding DB is not configured.');
  return binding;
}

export function createD1Db() {
  const binding = getD1Binding();
  return drizzle(binding as any);
}
