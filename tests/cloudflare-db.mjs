import assert from 'node:assert/strict';
import { getPlatformProxy } from 'wrangler';

// Integration check against the local D1 binding, never the remote database.
process.env.DATABASE_PROVIDER = 'd1';
process.env.CONFIG_ENCRYPTION_KEY = 'local-D1-integration-fixture-only';
const proxy = await getPlatformProxy({
  persist: { path: '.wrangler/state/v3' },
});
globalThis[Symbol.for('__cloudflare-context__')] = {
  env: proxy.env,
  ctx: proxy.ctx,
};
const binding = proxy.env.DB;
const names = ['cloudflare_qa_label', 'cloudflare_qa_api_key'];
try {
  const { saveConfigs, getDbConfigs } =
    await import('../src/modules/config/service.ts');
  const { db } = await import('../src/core/db/index.ts');
  await saveConfigs({
    cloudflare_qa_label: 'first',
    cloudflare_qa_api_key: 'fixture-value',
  });
  await saveConfigs({
    cloudflare_qa_label: 'updated',
    auth_secret: 'must-never-persist',
  });
  const stored = await binding
    .prepare('SELECT value FROM config WHERE name = ?')
    .bind(names[1])
    .first();
  assert.ok(stored.value.startsWith('enc:v1:'));
  const config = await getDbConfigs();
  assert.equal(config.cloudflare_qa_label, 'updated');
  assert.equal(config.cloudflare_qa_api_key, 'fixture-value');
  assert.equal(config.auth_secret, undefined);
  let callbackRan = false;
  assert.throws(
    () =>
      db().transaction(() => {
        callbackRan = true;
      }),
    /Interactive transactions/
  );
  assert.equal(callbackRan, false);
  console.log(
    'D1 integration passed: atomic config upsert, encryption, protected keys and transaction guard.'
  );
} finally {
  await binding.batch(
    names.map((name) =>
      binding.prepare('DELETE FROM config WHERE name = ?').bind(name)
    )
  );
  await proxy.dispose();
}
