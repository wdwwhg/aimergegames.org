import { getCloudflareContext } from '@opennextjs/cloudflare';

import type { EmailProvider } from '.';
import { CloudflareEmailProvider } from './cloudflare';
import {
  CloudflareBindingEmailProvider,
  type CloudflareEmailBinding,
} from './cloudflare-binding';
import { ResendProvider } from './resend';

function runtimeBinding(): CloudflareEmailBinding | undefined {
  try {
    return (
      getCloudflareContext().env as unknown as {
        EMAIL?: CloudflareEmailBinding;
      }
    ).EMAIL;
  } catch {
    return undefined;
  }
}

// One selection path for auth, public availability flags and administrator tests.
// The Worker binding avoids storing an account-wide Cloudflare API token.
export function getConfiguredEmailProvider(
  configs: Record<string, string>,
  binding = runtimeBinding()
): { provider: EmailProvider; from: string } | null {
  const selected = configs.email_provider || 'resend';
  if (selected === 'cloudflare') {
    const from = configs.cloudflare_email_sender_email;
    if (!from) return null;
    if (binding)
      return {
        provider: new CloudflareBindingEmailProvider({
          binding,
          defaultFrom: from,
        }),
        from,
      };
    const apiToken = configs.cloudflare_email_api_token;
    const accountId = configs.cloudflare_email_account_id;
    if (!apiToken || !accountId) return null;
    return {
      provider: new CloudflareEmailProvider({
        apiToken,
        accountId,
        defaultFrom: from,
      }),
      from,
    };
  }
  if (
    selected !== 'resend' ||
    !configs.resend_api_key ||
    !configs.resend_sender_email
  )
    return null;
  return {
    provider: new ResendProvider({
      apiKey: configs.resend_api_key,
      defaultFrom: configs.resend_sender_email,
    }),
    from: configs.resend_sender_email,
  };
}
