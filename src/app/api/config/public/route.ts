import { getConfiguredEmailProvider } from '@/core/email/configured';
import { respData } from '@/lib/resp';
import { getAllConfigs, filterPublicConfigs } from '@/modules/config/service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const noStore = {
  headers: {
    'Cache-Control': 'no-store, no-cache, must-revalidate',
  },
};

const publicKeys = [
  'app_name',
  'app_description',
  'app_logo',
  'email_auth_enabled',
  'google_auth_enabled',
  'google_one_tap_enabled',
  'google_client_id',
  'github_auth_enabled',
  'invite_code_required',
  // Custom URL schemes /auth-callback may hand a session token to.
  'desktop_auth_schemes',
  'select_payment_enabled',
  'default_payment_provider',
  'stripe_enabled',
  'creem_enabled',
  'paypal_enabled',
  'alipay_enabled',
  'wechat_enabled',
  'google_analytics_id',
  'plausible_domain',
  'plausible_src',
];

export async function GET() {
  const configs = await getAllConfigs();
  const result = filterPublicConfigs(configs, publicKeys);
  const emailConfigured = getConfiguredEmailProvider(configs) !== null;
  result.password_reset_enabled =
    configs.email_auth_enabled !== 'false' && emailConfigured
      ? 'true'
      : 'false';
  result.email_verification_enabled =
    configs.email_verification_enabled === 'true' && emailConfigured
      ? 'true'
      : 'false';
  return respData(result, noStore);
}
