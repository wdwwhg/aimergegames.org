import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

import { getAuth } from '@/core/auth';
import { getAdminConfigs, saveConfigs } from '@/modules/config/service';
import { hasPermission } from '@/modules/rbac/service';
import { respData, respErr, respOk } from '@/lib/resp';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const noStore = {
  headers: {
    'Cache-Control': 'no-store, no-cache, must-revalidate',
  },
};

export async function GET() {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return respErr('Unauthorized');

    const isAdmin = await hasPermission(session.user.id, 'admin.settings.read');
    if (!isAdmin) return respErr('Forbidden');

    // Masked + protected-keys-stripped view — never send raw configs to a client.
    const configs = await getAdminConfigs();
    return respData(configs, noStore);
  } catch (error: any) {
    return respErr(error.message || 'Internal error');
  }
}

export async function POST(req: Request) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return respErr('Unauthorized');

    const isAdmin = await hasPermission(
      session.user.id,
      'admin.settings.write'
    );
    if (!isAdmin) return respErr('Forbidden');

    const body = await req.json();
    if (!body || typeof body !== 'object') return respErr('Invalid body');

    await saveConfigs(body);

    // Static (SSG/ISR) pages bake config-driven output — analytics, ads,
    // customer-service scripts — into their prerendered HTML at build time.
    // Purge the whole page cache so saved settings take effect on the next
    // request instead of after the ISR window.
    revalidatePath('/', 'layout');

    return respOk(noStore);
  } catch (error: any) {
    return respErr(error.message || 'Internal error');
  }
}
