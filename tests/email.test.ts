import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { test } from 'node:test';
import { render } from '@react-email/components';

import { CloudflareBindingEmailProvider } from '../src/core/email/cloudflare-binding';
import { getConfiguredEmailProvider } from '../src/core/email/configured';
import { ResetPassword } from '../src/core/email/templates/reset-password';
import { VerifyEmail } from '../src/core/email/templates/verify-email';

test('Cloudflare native binding needs no API token and preserves every recipient', async () => {
  const calls: any[] = [];
  const binding = {
    send: async (mail: any) => {
      calls.push(mail);
      return { messageId: 'fixture-message' };
    },
  };
  const selected = getConfiguredEmailProvider(
    {
      email_provider: 'cloudflare',
      cloudflare_email_sender_email: 'noreply@example.test',
    },
    binding
  );
  assert.ok(selected);
  const result = await selected.provider.sendEmail({
    to: ['first@example.test', 'second@example.test'],
    cc: 'copy@example.test',
    subject: 'Fixture',
    text: 'Message',
    react: VerifyEmail({
      appName: 'Fixture App',
      url: 'https://example.test/verify?token=fixture-only',
    }),
  });
  assert.deepEqual(result, {
    success: true,
    messageId: 'fixture-message',
    provider: 'cloudflare',
  });
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].to, ['first@example.test', 'second@example.test']);
  assert.equal(calls[0].from, 'noreply@example.test');
  assert.match(calls[0].html, /Verify email/);
  assert.equal(calls[0].cc, 'copy@example.test');
  assert.equal('apiToken' in calls[0], false);
});

test('availability respects selected provider and rejects missing sender or transport', () => {
  const binding = { send: async () => ({ messageId: 'fixture' }) };
  assert.equal(
    getConfiguredEmailProvider({ email_provider: 'cloudflare' }, binding),
    null
  );
  assert.equal(
    getConfiguredEmailProvider({
      email_provider: 'cloudflare',
      cloudflare_email_sender_email: 'noreply@example.test',
    }),
    null
  );
  assert.equal(
    getConfiguredEmailProvider({ email_provider: 'resend' }, binding),
    null
  );
  assert.equal(
    getConfiguredEmailProvider(
      {
        email_provider: 'unknown',
        resend_api_key: 'fixture-only',
        resend_sender_email: 'noreply@example.test',
      },
      binding
    ),
    null
  );
  assert.ok(
    getConfiguredEmailProvider({
      email_provider: 'cloudflare',
      cloudflare_email_api_token: 'fixture-only',
      cloudflare_email_account_id: 'fixture-only',
      cloudflare_email_sender_email: 'noreply@example.test',
    })
  );
});

test('provider failures cannot leak auth links, recipient data or transport secrets', async () => {
  const provider = new CloudflareBindingEmailProvider({
    defaultFrom: 'noreply@example.test',
    binding: {
      send: async () => {
        throw Object.assign(new Error('private-key and password-reset-token'), {
          code: 'E_SENDER_NOT_VERIFIED',
        });
      },
    },
  });
  const result = await provider.sendEmail({
    to: 'user@example.test',
    subject: 'Fixture',
    text: 'token',
  });
  assert.equal(result.success, false);
  assert.match(result.error!, /sender domain/);
  assert.doesNotMatch(
    JSON.stringify(result),
    /private-key|password-reset-token|user@example/
  );
});

test('timeout does not resend and newline injection is rejected before delivery', async () => {
  let calls = 0;
  const provider = new CloudflareBindingEmailProvider({
    defaultFrom: 'noreply@example.test',
    timeoutMs: 5,
    binding: {
      send: async () => {
        calls++;
        return new Promise(() => {});
      },
    },
  });
  assert.equal(
    (
      await provider.sendEmail({
        to: 'user@example.test',
        subject: 'Fixture',
        text: 'Hello',
      })
    ).success,
    false
  );
  assert.equal(calls, 1);
  assert.equal(
    (
      await provider.sendEmail({
        to: 'user@example.test',
        subject: 'Fixture\r\nBcc: other@example.test',
        text: 'Hello',
      })
    ).success,
    false
  );
  assert.equal(calls, 1);
});

test('reset password email escapes user-controlled names and application text', async () => {
  const html = await render(
    ResetPassword({
      appName: 'App <script>unsafe</script>',
      name: '<img src=x onerror=alert(1)>',
      url: 'https://example.test/reset-password?token=fixture-only',
    })
  );
  assert.doesNotMatch(html, /<script>|<img src=x/);
  assert.match(html, /&lt;img/);
  assert.match(html, /Reset password/);
});

test('real signup verification and password-reset callbacks use the binding without sending externally', async () => {
  mkdirSync('.test-data', { recursive: true });
  process.env.DATABASE_PROVIDER = 'sqlite';
  process.env.DATABASE_URL = 'file:.test-data/email-' + randomUUID() + '.db';
  process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
  process.env.AUTH_URL = 'http://localhost:3000';
  process.env.AUTH_SECRET = 'local-email-fixture-only-secret';
  execFileSync(
    process.execPath,
    [
      'node_modules/drizzle-kit/bin.cjs',
      'push',
      '--force',
      '--config=drizzle.config.ts',
    ],
    { env: process.env, stdio: 'pipe' }
  );
  const key = Symbol.for('__cloudflare-context__');
  const previous = (globalThis as any)[key];
  const sent: any[] = [];
  (globalThis as any)[key] = {
    env: {
      EMAIL: {
        send: async (mail: any) => {
          sent.push(mail);
          return { messageId: 'fixture-' + sent.length };
        },
      },
    },
  };
  try {
    const configs = {
      email_provider: 'cloudflare',
      cloudflare_email_sender_email: 'noreply@example.test',
      email_verification_enabled: 'true',
      email_auth_enabled: 'true',
    };
    const { saveConfigs } = await import('../src/modules/config/service');
    await saveConfigs(configs);
    const { getAuth } = await import('../src/core/auth');
    const auth = getAuth(configs);
    const email = randomUUID() + '@example.test';
    await auth.api.signUpEmail({
      body: {
        email,
        password: 'fixture-only-password-4821',
        name: '<img src=x onerror=alert(1)>',
      },
    });
    assert.equal(
      sent.length,
      0,
      'Signup must not bypass the explicit verification-send flow'
    );
    await auth.api.sendVerificationEmail({
      body: { email, callbackURL: 'http://localhost:3000/dashboard/games' },
    });
    assert.equal(sent.length, 1);
    assert.equal(sent[0].to, email);
    assert.match(sent[0].html, /Verify email/);
    await auth.api.requestPasswordReset({
      body: { email, redirectTo: 'http://localhost:3000/reset-password' },
    });
    assert.equal(sent.length, 2);
    assert.equal(sent[1].to, email);
    assert.match(sent[1].html, /Reset password/);
    assert.doesNotMatch(sent[1].html, /<img src=x/);
    assert.match(sent[1].html, /&lt;img/);
    assert.ok(sent.every((mail) => mail.from === 'noreply@example.test'));
  } finally {
    (globalThis as any)[key] = previous;
  }
});
