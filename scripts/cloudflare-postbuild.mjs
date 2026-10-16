import { readFileSync, writeFileSync } from 'node:fs';

// OpenNext currently misses Next's direct middleware-manifest require:
// https://github.com/opennextjs/opennextjs-cloudflare/issues/1380
// Inline the traced manifest, matching the adapter's other manifest handling.
const handlerPath = '.open-next/server-functions/default/handler.mjs';
const manifest = JSON.parse(
  readFileSync(
    '.open-next/server-functions/default/.next/server/middleware-manifest.json',
    'utf8'
  )
);
const handler = readFileSync(handlerPath, 'utf8');
const needle = 'require(this.middlewareManifestPath)';
if (handler.includes(needle)) {
  writeFileSync(
    handlerPath,
    handler.replaceAll(needle, '(' + JSON.stringify(manifest) + ')')
  );
  console.log('Inlined Next middleware manifest for the Workers runtime.');
}
// Local .env files must never be embedded in production uploads.
writeFileSync(
  '.open-next/cloudflare/next-env.mjs',
  'export const production = {};\nexport const development = {};\nexport const test = {};\n'
);
console.log('Cloudflare package excludes all local .env configuration.');
