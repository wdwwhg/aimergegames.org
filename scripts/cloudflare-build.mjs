import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'jsonc-parser';

const errors = [];
const config = parse(readFileSync('wrangler.jsonc', 'utf8'), errors, {
  allowTrailingComma: true,
});
if (errors.length) throw new Error('Invalid Cloudflare configuration.');
// Keep client inlined origins and runtime bindings in agreement. No secrets are
// required at build time: production secrets are set on the deployed Worker.
const result = spawnSync(
  process.execPath,
  [
    ...(process.platform === 'win32'
      ? ['--require', resolve('scripts/cloudflare-windows.cjs')]
      : []),
    resolve('node_modules/@opennextjs/cloudflare/dist/cli/index.js'),
    'build',
    ...process.argv.slice(2),
  ],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      ...config.vars,
      NODE_ENV: 'production',
      CLOUDFLARE_BUILD: 'true',
    },
  }
);
if (result.status === 0) {
  // OpenNext collects .env files for ALL modes, including development. These
  // must never be uploaded. Production gets vars/bindings/secrets from Wrangler.
  await import('./cloudflare-postbuild.mjs');
}
process.exit(result.status ?? 1);
