import { headers } from 'next/headers';

import { getAuth } from '@/core/auth';

export async function gameUser() {
  const session = await getAuth().api.getSession({ headers: await headers() });
  return session?.user || null;
}
export const privateHeaders = {
  'Cache-Control': 'private, no-store',
  'X-Robots-Tag': 'noindex, nofollow',
};
